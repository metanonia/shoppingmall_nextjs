import { prisma } from "@shoppingmall/db";
import { hashPassword, verifyPassword } from "@shoppingmall/auth";
import { sanitizeRichText } from "./sanitize";
import { getShopConfig } from "./config";
import { renderVendorWelcomeEmail, sendMail } from "./mailer";

export type VendorProfile = {
  id: string;
  compName: string;
  compOwner: string;
  compTel: string;
  compEmail: string;
  auth: "R" | "Y" | "N";
  sell: "A" | "R" | "N";
  goodsAuth: "A" | "P";
};

function toProfile(row: {
  id: string;
  comp_name: string;
  comp_owner: string;
  comp_tel: string;
  comp_email: string;
  auth: "R" | "Y" | "N";
  sell: "A" | "R" | "N";
  goods_auth: "A" | "P";
}): VendorProfile {
  return {
    id: row.id,
    compName: row.comp_name,
    compOwner: row.comp_owner,
    compTel: row.comp_tel,
    compEmail: row.comp_email,
    auth: row.auth,
    sell: row.sell,
    goodsAuth: row.goods_auth,
  };
}

export type RegisterVendorInput = {
  id: string;
  password: string;
  compName: string;
  compOwner: string;
  compLicenseNo: string;
  compPostcode: string;
  compAddress1: string;
  compAddress2: string;
  compType: string;
  compItem: string;
  compEmail: string;
  compTel: string;
  compFax: string;
  contName: string;
  contCell: string;
  contEmail: string;
  contPart: string;
  contPosition: string;
  accountCycle: number;
  bankName: string;
  bankNum: string;
  bankOwner: string;
  image1: string;
  image2: string;
};

export type RegisterVendorResult = { ok: true; profile: VendorProfile } | { ok: false; error: string };

// Port of php/regist_vendor_post.php. Public self-service application (like
// /regist for members) — not an admin-created account. Legacy also accepts
// business-registration document uploads (attach_file1/2); this repo skips
// those (admin approval here is a judgment call on the text fields alone,
// same "no blocking dependency, revisit if needed" precedent used for other
// skipped upload flows). Server-forced fields match legacy exactly: new
// vendors always start pending (auth='R'/sell='R') with auto-approved
// product listing (goods_auth='A') — admin approval is the existing
// `/vendors` screen (`updateVendorAuth`), not new work here.
export async function registerVendor(input: RegisterVendorInput): Promise<RegisterVendorResult> {
  if (!input.id || !input.password || !input.compName || !input.compOwner) {
    return { ok: false, error: "필수 정보가 제대로 넘어오지 못했습니다." };
  }

  const existing = await prisma.vendor.findFirst({ where: { id: input.id } });
  if (existing) return { ok: false, error: `${input.id}는 사용하실 수 없는 아이디 입니다.` };

  const passwordHash = await hashPassword(input.password);
  const now = Math.floor(Date.now() / 1000);

  const row = await prisma.vendor.create({
    data: {
      id: input.id,
      passwd: passwordHash,
      comp_name: input.compName,
      comp_owner: input.compOwner,
      comp_license_no: input.compLicenseNo,
      comp_postcode: input.compPostcode,
      comp_address1: input.compAddress1,
      comp_address2: input.compAddress2,
      comp_type: input.compType,
      comp_item: input.compItem,
      comp_email: input.compEmail,
      comp_tel: input.compTel,
      comp_fax: input.compFax,
      cont_name: input.contName,
      cont_cell: input.contCell,
      cont_email: input.contEmail,
      cont_part: input.contPart,
      cont_position: input.contPosition,
      account_cycle: input.accountCycle,
      bank_name: input.bankName,
      bank_num: input.bankNum,
      bank_owner: input.bankOwner,
      image1: input.image1,
      image2: input.image2,
      auth: "R",
      sell: "R",
      goods_auth: "A",
      commission: 0,
      signdate: now,
    },
  });

  if (row.comp_email) {
    const config = await getShopConfig();
    const rendered = await renderVendorWelcomeEmail({ shopName: config.basicName, vendorId: row.id, vendorName: row.comp_name });
    if (rendered) await sendMail({ to: row.comp_email, subject: rendered.subject, html: rendered.html });
  }

  return { ok: true, profile: toProfile(row) };
}

export type VendorLoginResult =
  | { ok: true; profile: VendorProfile }
  | { ok: false; error: string; lockedUntil?: Date };

const LOGIN_LIMIT_COUNT = 5;
const LOGIN_LIMIT_MINUTES = 10;

// Port of vendor/main/login_ok.php. Same fail_cnts/fail_time lockout shape
// as authenticateMember (member.ts), but with a fixed threshold instead of
// reading mallRN_configuration's member-specific login-limit settings —
// those columns are about member login, not vendor, so reusing them would
// be semantically wrong even though the mechanism looks identical.
export async function authenticateVendor(id: string, password: string): Promise<VendorLoginResult> {
  const row = await prisma.vendor.findFirst({ where: { id } });
  if (!row) return { ok: false, error: "아이디 또는 비밀번호가 일치하지 않습니다." };

  const now = Math.floor(Date.now() / 1000);
  if (row.fail_cnts >= LOGIN_LIMIT_COUNT) {
    const unlockAt = row.fail_time + LOGIN_LIMIT_MINUTES * 60;
    if (unlockAt > now) {
      return {
        ok: false,
        error: `비밀번호 ${LOGIN_LIMIT_COUNT}회 연속실패로 로그인이 일시 중지 되었습니다.`,
        lockedUntil: new Date(unlockAt * 1000),
      };
    }
  }

  if (row.auth !== "Y") {
    return { ok: false, error: "아직 입점 승인이 완료되지 않았습니다. 관리자에게 문의 바랍니다." };
  }

  const valid = await verifyPassword(row.passwd, password);
  if (!valid) {
    const failCnts = row.fail_time + LOGIN_LIMIT_MINUTES * 60 < now ? 1 : row.fail_cnts + 1;
    await prisma.vendor.update({ where: { uid: row.uid }, data: { fail_cnts: failCnts, fail_time: now } });
    return { ok: false, error: "아이디 또는 비밀번호가 일치하지 않습니다." };
  }

  const updated = await prisma.vendor.update({ where: { uid: row.uid }, data: { fail_cnts: 0, fail_time: 0, login_time: now } });
  return { ok: true, profile: toProfile(updated) };
}

export async function getVendorProfile(id: string): Promise<VendorProfile | null> {
  const row = await prisma.vendor.findFirst({ where: { id } });
  return row ? toProfile(row) : null;
}

// Editable subset (vendor/conf/vendor_post.php's $item_array — 19 fields).
// auth/sell/goodsAuth/deliveryType/commission/accountCycle are admin-only
// (surfaced read-only in VendorInfoView below) and id/password have their
// own dedicated flows (registration is one-time, password change is
// changeVendorPassword).
export type UpdateVendorInfoInput = Omit<RegisterVendorInput, "id" | "password" | "accountCycle"> & {
  image1?: string;
  image2?: string;
};

export type VendorInfoView = UpdateVendorInfoInput & {
  id: string;
  image1: string;
  image2: string;
  auth: "R" | "Y" | "N";
  sell: "A" | "R" | "N";
  goodsAuth: "A" | "P";
  deliveryType: number;
  commission: number;
  accountCycle: number;
};

// Port of vendor/conf/vendor_info.php's read side — includes the
// admin-controlled fields (for display only; updateVendorInfo can't touch
// them) alongside the vendor-editable ones.
export async function getVendorInfo(vendorId: string): Promise<VendorInfoView | null> {
  const row = await prisma.vendor.findFirst({ where: { id: vendorId } });
  if (!row) return null;
  return {
    id: row.id,
    compName: row.comp_name,
    compOwner: row.comp_owner,
    compLicenseNo: row.comp_license_no,
    compPostcode: row.comp_postcode,
    compAddress1: row.comp_address1,
    compAddress2: row.comp_address2,
    compType: row.comp_type,
    compItem: row.comp_item,
    compEmail: row.comp_email,
    compTel: row.comp_tel,
    compFax: row.comp_fax,
    contName: row.cont_name,
    contCell: row.cont_cell,
    contEmail: row.cont_email,
    contPart: row.cont_part,
    contPosition: row.cont_position,
    bankName: row.bank_name,
    bankNum: row.bank_num,
    bankOwner: row.bank_owner,
    image1: row.image1,
    image2: row.image2,
    auth: row.auth,
    sell: row.sell,
    goodsAuth: row.goods_auth,
    deliveryType: row.delivery_type,
    commission: row.commission,
    accountCycle: row.account_cycle,
  };
}

export type UpdateVendorInfoResult = { ok: true } | { ok: false; error: string };

// Port of vendor/conf/vendor_post.php's default case — every field here is
// vendor-owned, so no ownership check beyond the caller already holding a
// session for this vendorId (enforced by the backoffice action layer).
export async function updateVendorInfo(vendorId: string, input: UpdateVendorInfoInput): Promise<UpdateVendorInfoResult> {
  const existing = await prisma.vendor.findFirst({ where: { id: vendorId } });
  if (!existing) return { ok: false, error: "존재하지 않는 입점사입니다." };

  await prisma.vendor.update({
    where: { uid: existing.uid },
    data: {
      comp_name: input.compName,
      comp_owner: input.compOwner,
      comp_license_no: input.compLicenseNo,
      comp_postcode: input.compPostcode,
      comp_address1: input.compAddress1,
      comp_address2: input.compAddress2,
      comp_type: input.compType,
      comp_item: input.compItem,
      comp_email: input.compEmail,
      comp_tel: input.compTel,
      comp_fax: input.compFax,
      cont_name: input.contName,
      cont_cell: input.contCell,
      cont_email: input.contEmail,
      cont_part: input.contPart,
      cont_position: input.contPosition,
      bank_name: input.bankName,
      bank_num: input.bankNum,
      bank_owner: input.bankOwner,
      ...(input.image1 !== undefined && { image1: input.image1 }),
      ...(input.image2 !== undefined && { image2: input.image2 }),
    },
  });
  return { ok: true };
}

export type ChangeVendorPasswordResult = { ok: true } | { ok: false; error: string };

// Port of vendor/conf/vendor_post.php's case "passwd" — same
// verify-current-then-hash-new shape as member.ts's changeMemberPassword,
// simpler since vendors have no SNS-login branch to skip.
export async function changeVendorPassword(id: string, currentPassword: string, newPassword: string): Promise<ChangeVendorPasswordResult> {
  const row = await prisma.vendor.findFirst({ where: { id }, select: { uid: true, passwd: true } });
  if (!row) return { ok: false, error: "존재하지 않는 입점사입니다." };

  const valid = await verifyPassword(row.passwd, currentPassword);
  if (!valid) return { ok: false, error: "비밀번호가 일치하지 않습니다." };

  await prisma.vendor.update({ where: { uid: row.uid }, data: { passwd: await hashPassword(newPassword) } });
  return { ok: true };
}

export type VendorConfigurationInput = {
  csTime1: string;
  csTime2: string;
  csTime3: string;
  csTime4: string;
  rtnPostcode: string;
  rtnAddress1: string;
  rtnAddress2: string;
  deliveryType: "F" | "D" | "P";
  deliveryDPrice: number;
  deliveryPType: string;
  deliveryPPrice1: number;
  deliveryPPrice2: number;
  deliveryInfo: string;
  refundInfo: string;
  exchangeInfo: string;
  asInfo: string;
  displayBest: number;
  displayReco: number;
  displayNew: number;
  // Suggestion lists (not enforced pickers — GoodsForm's brand/origin fields
  // stay free text either way, see H5) for this vendor's own product form,
  // one value per line in the admin textarea.
  brandInfo: string[];
  makeInfo: string[];
  originInfo: string[];
  optionInfo: string[];
};

export type VendorConfigurationView = VendorConfigurationInput;

function splitMultiValue(raw: string): string[] {
  return raw
    .split("|*|")
    .map((v) => v.trim())
    .filter(Boolean);
}

// Subset of mallRN_vendor_configuration this migration exposes for editing —
// CS hours, return address, the 4 policy guide texts (used as this vendor's
// default when creating a new product, see goods-admin.ts), the 3
// store_display section toggles (store.ts's getStoreSections, added once
// store_display was un-scoped-out — see goods-display.ts's header comment),
// and the option/brand/manufacturer/origin suggestion lists. Delivery pricing is consumed by cart.ts for each
// vendor_delivery group; push tokens are managed on the separate page.
export async function getVendorConfiguration(vendorId: string): Promise<VendorConfigurationView | null> {
  const row = await prisma.vendorConfiguration.findFirst({ where: { vendor: vendorId } });
  if (!row) return null;
  return {
    csTime1: row.basic_cs_time1,
    csTime2: row.basic_cs_time2,
    csTime3: row.basic_cs_time3,
    csTime4: row.basic_cs_time4,
    rtnPostcode: row.comp_rtn_postcode,
    rtnAddress1: row.comp_rtn_address1,
    rtnAddress2: row.comp_rtn_address2,
    deliveryType: row.delivery_type,
    deliveryDPrice: row.delivery_d_price,
    deliveryPType: row.delivery_p_type,
    deliveryPPrice1: row.delivery_p_price1,
    deliveryPPrice2: row.delivery_p_price2,
    deliveryInfo: row.goods_delivery_info,
    refundInfo: row.goods_refund_info,
    exchangeInfo: row.goods_exchange_info,
    asInfo: row.goods_as_info,
    displayBest: row.design_main_display1,
    displayReco: row.design_main_display2,
    displayNew: row.design_main_display3,
    brandInfo: splitMultiValue(row.goods_brand_info),
    makeInfo: splitMultiValue(row.goods_make_info),
    originInfo: splitMultiValue(row.goods_origin_info),
    optionInfo: splitMultiValue(row.goods_option_info),
  };
}

export type VendorGoodsMasterValues = { brands: string[]; makes: string[]; origins: string[]; options: string[] };

// Convenience read used by the vendor goods-form pages (new/edit) — same
// data as getVendorConfiguration, narrowed to what GoodsForm's masterValues
// prop needs.
export async function getVendorGoodsMasterValues(vendorId: string): Promise<VendorGoodsMasterValues> {
  const config = await getVendorConfiguration(vendorId);
  return { brands: config?.brandInfo ?? [], makes: config?.makeInfo ?? [], origins: config?.originInfo ?? [], options: config?.optionInfo ?? [] };
}

export type VendorConfigResult = { ok: true } | { ok: false; error: string };

export async function updateVendorConfiguration(vendorId: string, input: VendorConfigurationInput): Promise<VendorConfigResult> {
  const data = {
    basic_cs_time1: input.csTime1,
    basic_cs_time2: input.csTime2,
    basic_cs_time3: input.csTime3,
    basic_cs_time4: input.csTime4,
    comp_rtn_postcode: input.rtnPostcode,
    comp_rtn_address1: input.rtnAddress1,
    comp_rtn_address2: input.rtnAddress2,
    delivery_type: input.deliveryType,
    delivery_d_price: Math.max(0, input.deliveryDPrice),
    delivery_p_type: input.deliveryPType,
    delivery_p_price1: Math.max(0, input.deliveryPPrice1),
    delivery_p_price2: Math.max(0, input.deliveryPPrice2),
    goods_delivery_info: sanitizeRichText(input.deliveryInfo),
    goods_refund_info: sanitizeRichText(input.refundInfo),
    goods_exchange_info: sanitizeRichText(input.exchangeInfo),
    goods_as_info: sanitizeRichText(input.asInfo),
    design_main_display1: input.displayBest,
    design_main_display2: input.displayReco,
    design_main_display3: input.displayNew,
    goods_brand_info: input.brandInfo.join("|*|"),
    goods_make_info: input.makeInfo.join("|*|"),
    goods_origin_info: input.originInfo.join("|*|"),
    goods_option_info: input.optionInfo.join("|*|"),
  };

  const existing = await prisma.vendorConfiguration.findFirst({ where: { vendor: vendorId } });
  if (existing) {
    await prisma.vendorConfiguration.update({ where: { uid: existing.uid }, data });
  } else {
    await prisma.vendorConfiguration.create({ data: { vendor: vendorId, ...data } });
  }
  return { ok: true };
}

export type VendorDashboardStats = { todayOrderCount: number; todaySalesTotal: number; todayGoodsCount: number; todayVisitorCount: number; pendingGoodsCount: number; unansweredInquiryCount: number; activeOrderChangeCount: number; shippingCount: number; reviewCount: number; settlementPendingCount: number; boardTodayCount: number; boardTotalCount: number; orderStepCounts: { status: number; today: number; total: number }[]; recentOrders: { id: string; label: string }[]; recentInquiries: { id: string; label: string }[]; recentReviews: { id: string; label: string }[]; recentNotices: { id: string; label: string }[]; recentSettlements: { id: string; label: string }[] };

function todayStartUnix(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor(now.getTime() / 1000);
}

// Vendor counterpart of managers/vendor/widget/*.
export async function getVendorDashboardStats(vendorId: string): Promise<VendorDashboardStats> {
  const since = todayStartUnix();

  const [lines, pendingGoodsCount, unansweredInquiryCount, activeOrderChangeCount, shippingCount, reviewCount, settlementPendingCount, todayGoodsCount, visitors, boardTodayCount, boardTotalCount, allOrderLines, recentOrders, recentInquiries, recentReviews, recentNotices, recentSettlements] = await Promise.all([
    prisma.orderGoods.findMany({ where: { vendor: vendorId, reals: 1, signdate: { gte: since } }, select: { price: true, qty: true } }),
    prisma.goods.count({ where: { vendor: vendorId, auth_ck: "N" } }),
    prisma.inquiry.count({ where: { vendor: vendorId, answer: "" } }),
    prisma.orderStatusChange.count({ where: { vendor: vendorId, status2: { in: [1, 2, 3, 4] } } }),
    prisma.orderGoods.count({ where: { vendor: vendorId, reals: 1, status: { in: [2, 3] } } }),
    prisma.review.count({ where: { vendor: vendorId } }),
    prisma.salesCalculate.count({ where: { vendor: vendorId, status: 0 } }),
    prisma.goods.count({ where: { vendor: vendorId, signdate: { gte: since } } }),
    prisma.visitorEvent.findMany({ where: { vendor: vendorId, signdate: { gte: since } }, distinct: ["visitor_key"], select: { visitor_key: true } }),
    prisma.boardPost.count({ where: { board: "vcounsel", id: vendorId, signdate: { gte: since } } }),
    prisma.boardPost.count({ where: { board: "vcounsel", id: vendorId } }),
    prisma.orderGoods.findMany({ where: { vendor: vendorId, reals: 1 }, select: { status: true, signdate: true } }),
    prisma.orderGoods.findMany({ where: { vendor: vendorId, reals: 1 }, orderBy: { uid: "desc" }, take: 4, select: { uid: true, order_num: true, g_name: true } }),
    prisma.inquiry.findMany({ where: { vendor: vendorId }, orderBy: { uid: "desc" }, take: 4, select: { uid: true, subject: true } }),
    prisma.review.findMany({ where: { vendor: vendorId }, orderBy: { uid: "desc" }, take: 4, select: { uid: true, g_name: true, name: true } }),
    prisma.boardPost.findMany({ where: { board: "vnotice" }, orderBy: { uid: "desc" }, take: 4, select: { uid: true, subject: true } }),
    prisma.salesCalculate.findMany({ where: { vendor: vendorId }, orderBy: { uid: "desc" }, take: 4, select: { uid: true, date_from: true, date_to: true, payout_total: true } }),
  ]);

  return {
    todayOrderCount: lines.length,
    todaySalesTotal: lines.reduce((sum, l) => sum + l.price * l.qty, 0),
    todayGoodsCount,
    todayVisitorCount: visitors.length,
    pendingGoodsCount,
    unansweredInquiryCount,
    activeOrderChangeCount,
    shippingCount,
    reviewCount,
    settlementPendingCount,
    boardTodayCount,
    boardTotalCount,
    orderStepCounts: Array.from({ length: 7 }, (_, status) => ({ status, today: allOrderLines.filter((line) => line.status === status && line.signdate >= since).length, total: allOrderLines.filter((line) => line.status === status).length })),
    recentOrders: recentOrders.map((row) => ({ id: String(row.uid), label: `${row.order_num} · ${row.g_name}` })),
    recentInquiries: recentInquiries.map((row) => ({ id: String(row.uid), label: row.subject })),
    recentReviews: recentReviews.map((row) => ({ id: String(row.uid), label: `${row.g_name} · ${row.name}` })),
    recentNotices: recentNotices.map((row) => ({ id: String(row.uid), label: row.subject })),
    recentSettlements: recentSettlements.map((row) => ({ id: String(row.uid), label: `${row.date_from}~${row.date_to} · ${row.payout_total.toLocaleString("ko-KR")}원` })),
  };
}
