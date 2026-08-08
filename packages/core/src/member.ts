import { prisma } from "@shoppingmall/db";
import { hashPassword, verifyPassword } from "@shoppingmall/auth";
import { getShopConfig } from "./config";
import { renderPasswordResetCodeEmail, renderWelcomeEmail, sendMail } from "./mailer";
import { sendAutoSms } from "./sms";
import { issueCoupon } from "./coupon";
import { saveMileage } from "./mileage";
import { sendPushNotification } from "./push";

export type MemberProfile = {
  id: string;
  name: string;
  email: string;
  tel: string;
  cell: string;
  postcode: string;
  address1: string;
  address2: string;
  birth: string;
  birthSl: string;
  gender: string;
  marry: string;
  hobby: string;
  job: string;
  comp: string;
  compOwner: string;
  compNum: string;
  compPostcode: string;
  compAddress1: string;
  compAddress2: string;
  compType: string;
  compItem: string;
  add: [string, string, string, string, string];
  mailling: boolean;
  sms: boolean;
  level: number;
  mileage: number;
  snsType: string;
  signdate: number;
};

function toProfile(row: {
  id: string;
  name: string;
  email: string;
  tel: string;
  cell: string;
  postcode: string;
  address1: string;
  address2: string;
  birth: string;
  birth_sl: string;
  gender: string;
  marry: string;
  hobby: string;
  job: string;
  comp: string;
  comp_owner: string;
  comp_num: string;
  comp_postcode: string;
  comp_address1: string;
  comp_address2: string;
  comp_type: string;
  comp_item: string;
  add1: string;
  add2: string;
  add3: string;
  add4: string;
  add5: string;
  mailling: string;
  sms: string;
  level: number;
  mileage: number;
  sns_type: string;
  signdate: number;
}): MemberProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    tel: row.tel,
    cell: row.cell,
    postcode: row.postcode,
    address1: row.address1,
    address2: row.address2,
    birth: row.birth,
    birthSl: row.birth_sl,
    gender: row.gender,
    marry: row.marry,
    hobby: row.hobby,
    job: row.job,
    comp: row.comp,
    compOwner: row.comp_owner,
    compNum: row.comp_num,
    compPostcode: row.comp_postcode,
    compAddress1: row.comp_address1,
    compAddress2: row.comp_address2,
    compType: row.comp_type,
    compItem: row.comp_item,
    add: [row.add1, row.add2, row.add3, row.add4, row.add5],
    mailling: row.mailling === "Y",
    sms: row.sms === "Y",
    level: row.level,
    mileage: row.mileage,
    snsType: row.sns_type,
    signdate: row.signdate,
  };
}

// Port of php/regist.php's `$item_array` of `member_form_*` flags, scoped to
// the common fields this port implements (tel/cell/address/mail/sms consent).
// The long tail of rarely-used optional fields (birth, gender, marry, job,
// hobby, B2B company fields, 5 admin-defined custom fields) isn't wired up —
// see MIGRATION.md / migration_deferred_items memory.
export type MemberFormConfig = {
  telRequired: 0 | 1 | 2;
  cellRequired: 0 | 1 | 2;
  addressRequired: 0 | 1 | 2;
  birthRequired: 0 | 1 | 2;
  genderRequired: 0 | 1 | 2;
  marryRequired: 0 | 1 | 2;
  jobRequired: 0 | 1 | 2;
  hobbyRequired: 0 | 1 | 2;
  compRequired: 0 | 1 | 2;
  compNumRequired: 0 | 1 | 2;
  compOwnerRequired: 0 | 1 | 2;
  compAddressRequired: 0 | 1 | 2;
  compTypeRequired: 0 | 1 | 2;
  compItemRequired: 0 | 1 | 2;
  jobOptions: string[];
  hobbyOptions: string[];
  customFields: { key: "add1" | "add2" | "add3" | "add4" | "add5"; title: string; required: 0 | 1 | 2 }[];
  maillingEnabled: boolean;
  smsEnabled: boolean;
  memberAuthAuto: boolean;
  loginLimitCount: number;
  loginLimitMinutes: number;
  mileageEnabled: boolean;
  joinMileage: number;
  orderMileage: number;
  agreementTerms: string;
  agreementPrivacy: string;
};

// Port of the member/agreement settings row — legacy stores these in
// mallRN_configuration WHERE uid=2 (a second row in the same wide table
// php/init.php:85's shop_config/uid=1 also uses), not a separate table.
export async function getMemberFormConfig(): Promise<MemberFormConfig> {
  const row = await prisma.configuration.findUnique({ where: { uid: 2 } });
  return {
    telRequired: (row?.member_form_tel ?? 0) as 0 | 1 | 2,
    cellRequired: (row?.member_form_cell ?? 0) as 0 | 1 | 2,
    addressRequired: (row?.member_form_address ?? 0) as 0 | 1 | 2,
    birthRequired: (row?.member_form_birth ?? 0) as 0 | 1 | 2,
    genderRequired: (row?.member_form_gender ?? 0) as 0 | 1 | 2,
    marryRequired: (row?.member_form_marry ?? 0) as 0 | 1 | 2,
    jobRequired: (row?.member_form_job ?? 0) as 0 | 1 | 2,
    hobbyRequired: (row?.member_form_hobby ?? 0) as 0 | 1 | 2,
    compRequired: (row?.member_form_comp ?? 0) as 0 | 1 | 2,
    compNumRequired: (row?.member_form_comp_num ?? 0) as 0 | 1 | 2,
    compOwnerRequired: (row?.member_form_comp_owner ?? 0) as 0 | 1 | 2,
    compAddressRequired: (row?.member_form_comp_address ?? 0) as 0 | 1 | 2,
    compTypeRequired: (row?.member_form_comp_type ?? 0) as 0 | 1 | 2,
    compItemRequired: (row?.member_form_comp_item ?? 0) as 0 | 1 | 2,
    jobOptions: (row?.member_form_job_info ?? "").split("|").filter(Boolean),
    hobbyOptions: (row?.member_form_hobby_info ?? "").split("|").filter(Boolean),
    customFields: ([1, 2, 3, 4, 5] as const).map((number) => ({
      key: `add${number}` as "add1" | "add2" | "add3" | "add4" | "add5",
      title: row?.[`member_form_add${number}_title`] ?? "",
      required: (row?.[`member_form_add${number}`] ?? 0) as 0 | 1 | 2,
    })),
    maillingEnabled: (row?.member_form_mailling ?? 0) > 0,
    smsEnabled: (row?.member_form_sms ?? 0) > 0,
    memberAuthAuto: (row?.member_auth ?? "A") === "A",
    loginLimitCount: row?.member_limit_count ?? 0,
    loginLimitMinutes: row?.member_limit_minute ?? 0,
    mileageEnabled: row?.member_mileage_yn === "Y",
    joinMileage: row?.member_mileage_join ?? 0,
    orderMileage: row?.member_mileage_order ?? 0,
    agreementTerms: row?.agreement_info1 ?? "",
    agreementPrivacy: row?.agreement_info3 ?? "",
  };
}

export type UpdateMemberFormConfigInput = Omit<MemberFormConfig, "agreementTerms" | "agreementPrivacy">;

// Admin-facing write side of getMemberFormConfig — same field scope (the
// long-tail fields are still out per that function's comment).
export async function updateMemberFormConfig(input: UpdateMemberFormConfigInput): Promise<void> {
  await prisma.configuration.update({
    where: { uid: 2 },
    data: {
      member_form_tel: input.telRequired,
      member_form_cell: input.cellRequired,
      member_form_address: input.addressRequired,
      member_form_birth: input.birthRequired,
      member_form_gender: input.genderRequired,
      member_form_marry: input.marryRequired,
      member_form_job: input.jobRequired,
      member_form_hobby: input.hobbyRequired,
      member_form_comp: input.compRequired,
      member_form_comp_num: input.compNumRequired,
      member_form_comp_owner: input.compOwnerRequired,
      member_form_comp_address: input.compAddressRequired,
      member_form_comp_type: input.compTypeRequired,
      member_form_comp_item: input.compItemRequired,
      member_form_job_info: input.jobOptions.join("|"),
      member_form_hobby_info: input.hobbyOptions.join("|"),
      ...Object.fromEntries(input.customFields.flatMap((field, index) => [
        [`member_form_add${index + 1}_title`, field.title],
        [`member_form_add${index + 1}`, field.required],
      ])),
      member_form_mailling: input.maillingEnabled ? 1 : 0,
      member_form_sms: input.smsEnabled ? 1 : 0,
      member_auth: input.memberAuthAuto ? "A" : "P",
      member_limit_count: input.loginLimitCount,
      member_limit_minute: input.loginLimitMinutes,
      member_mileage_yn: input.mileageEnabled ? "Y" : "N",
      member_mileage_join: Math.max(0, input.joinMileage),
      member_mileage_order: Math.max(0, input.orderMileage),
    },
  });
}

export type AgreementPages = { terms: string; privacy: string };

// Port of php/agreement.php / privacy.php's source rows — full-page rich
// text, distinct from getMemberFormConfig's agreement_info1/3 (registration
// checkbox summary text). Both live in the same uid=2 row.
export async function getAgreementPages(): Promise<AgreementPages> {
  const row = await prisma.configuration.findUnique({ where: { uid: 2 } });
  return { terms: row?.agreement_info1 ?? "", privacy: row?.agreement_info2 ?? "" };
}

export async function updateAgreementPages(input: AgreementPages): Promise<void> {
  await prisma.configuration.update({ where: { uid: 2 }, data: { agreement_info1: input.terms, agreement_info2: input.privacy } });
}

export type RegisterMemberInput = {
  id: string;
  password: string;
  name: string;
  email: string;
  tel?: string;
  cell?: string;
  postcode?: string;
  address1?: string;
  address2?: string;
  birth?: string;
  birthSl?: "N" | "S" | "L";
  gender?: "N" | "M" | "F";
  marry?: "N" | "M" | "S";
  hobby?: string;
  job?: string;
  comp?: string;
  compOwner?: string;
  compNum?: string;
  compPostcode?: string;
  compAddress1?: string;
  compAddress2?: string;
  compType?: string;
  compItem?: string;
  add?: [string, string, string, string, string];
  mailling?: boolean;
  sms?: boolean;
  isMobile?: boolean;
};

export type RegisterMemberResult =
  | { ok: true; profile: MemberProfile; approved: boolean; welcomeMileage: number }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateConfiguredMemberFields(config: MemberFormConfig, input: RegisterMemberInput): string | null {
  const fields: [number, string | undefined, string][] = [
    [config.telRequired, input.tel, "전화번호"],
    [config.cellRequired, input.cell, "휴대폰번호"],
    [config.addressRequired, input.address1, "주소"],
    [config.birthRequired, input.birth, "생년월일"],
    [config.genderRequired, input.gender === "N" ? "" : input.gender, "성별"],
    [config.marryRequired, input.marry === "N" ? "" : input.marry, "결혼여부"],
    [config.jobRequired, input.job, "직업"],
    [config.hobbyRequired, input.hobby, "관심분야"],
    [config.compRequired, input.comp, "회사명"],
    [config.compNumRequired, input.compNum, "사업자등록번호"],
    [config.compOwnerRequired, input.compOwner, "대표자명"],
    [config.compAddressRequired, input.compAddress1, "사업자주소"],
    [config.compTypeRequired, input.compType, "업태"],
    [config.compItemRequired, input.compItem, "종목"],
  ];
  config.customFields.forEach((field, index) => fields.push([field.required, input.add?.[index], field.title || `추가항목 ${index + 1}`]));
  const missing = fields.find(([level, value]) => level === 2 && !value?.trim());
  return missing ? `${missing[2]}을(를) 입력해 주세요.` : null;
}

// Port of php/regist_post.php's mode=new. Welcome mileage/coupon issuance and
// the join notification email/SMS/FCM push are skipped — mallRN_coupon_manager
// doesn't exist yet and notification sending is Phase 5 (payment/alerts).
export async function registerMember(input: RegisterMemberInput): Promise<RegisterMemberResult> {
  if (!input.id || !input.password || !input.name || !input.email) {
    return { ok: false, error: "필수 정보가 제대로 넘어오지 못했습니다." };
  }
  if (!EMAIL_RE.test(input.email)) {
    return { ok: false, error: `${input.email} 은 존재하지 않는 메일주소입니다.` };
  }

  const existing = await prisma.member.findUnique({ where: { id: input.id } });
  if (existing) {
    return { ok: false, error: `${input.id}는 사용하실 수 없는 아이디 입니다.` };
  }

  const [config, memberConfig, shopConfig] = await Promise.all([
    getMemberFormConfig(),
    prisma.configuration.findUniqueOrThrow({ where: { uid: 2 } }),
    getShopConfig(),
  ]);
  const requiredError = validateConfiguredMemberFields(config, input);
  if (requiredError) return { ok: false, error: requiredError };
  const passwordHash = await hashPassword(input.password);
  const now = Math.floor(Date.now() / 1000);

  const row = await prisma.member.create({
    data: {
      id: input.id,
      passwd: passwordHash,
      name: input.name,
      email: input.email,
      tel: input.tel ?? "",
      cell: input.cell ?? "",
      postcode: input.postcode ?? "",
      address1: input.address1 ?? "",
      address2: input.address2 ?? "",
      birth: input.birth ?? "",
      birth_sl: input.birthSl ?? "N",
      gender: input.gender ?? "N",
      marry: input.marry ?? "N",
      hobby: input.hobby ?? "",
      job: input.job ?? "",
      comp: input.comp ?? "",
      comp_owner: input.compOwner ?? "",
      comp_num: input.compNum ?? "",
      comp_postcode: input.compPostcode ?? "",
      comp_address1: input.compAddress1 ?? "",
      comp_address2: input.compAddress2 ?? "",
      comp_type: input.compType ?? "",
      comp_item: input.compItem ?? "",
      add1: input.add?.[0] ?? "",
      add2: input.add?.[1] ?? "",
      add3: input.add?.[2] ?? "",
      add4: input.add?.[3] ?? "",
      add5: input.add?.[4] ?? "",
      mailling: input.mailling ? "Y" : "N",
      mailling_date: now,
      sms: input.sms ? "Y" : "N",
      sms_date: now,
      level: 1,
      cnts: 1,
      login_time: now,
      mobile: input.isMobile ? "Y" : "N",
      auth: config.memberAuthAuto ? "Y" : "N",
      signdate: now,
    },
  });

  const welcomeMileage = memberConfig.member_mileage_yn === "Y" ? memberConfig.member_mileage_join : 0;
  if (welcomeMileage > 0) {
    await saveMileage(input.id, welcomeMileage, "회원가입 축하 적립금", {
      memberMileageValidityYn: memberConfig.member_mileage_validity_yn,
      memberMileageValidity: memberConfig.member_mileage_validity,
      memberMileageValidityType: memberConfig.member_mileage_validity_type,
    });
  }

  const welcomeCoupons = await prisma.couponManager.findMany({ where: { type: 1 } });
  await Promise.all(welcomeCoupons.map((coupon) => issueCoupon(input.id, coupon.uid)));

  const rendered = await renderWelcomeEmail({
    shopName: shopConfig.basicName,
    memberId: input.id,
    memberName: input.name,
    smsAccepted: Boolean(input.sms),
    mailAccepted: Boolean(input.mailling),
    changedAt: new Date(now * 1000),
  });
  if (rendered) await sendMail({ to: input.email, subject: rendered.subject, html: rendered.html });
  if (input.cell) {
    await sendAutoSms("regist", input.cell, { NAME: input.name }, shopConfig);
  }
  await sendPushNotification("신규 회원가입 알림!", `${input.name}님이 새로운 회원이 되셨습니다.`).catch(() => {});

  const updated = welcomeMileage > 0 ? await prisma.member.findUniqueOrThrow({ where: { id: input.id } }) : row;
  return { ok: true, profile: toProfile(updated), approved: row.auth === "Y", welcomeMileage };
}

export type LoginResult =
  | { ok: true; profile: MemberProfile; reactivated: boolean }
  | { ok: false; error: string; lockedUntil?: Date };

// Port of php/login_post.php. Dormant-account (`mallRN_member_sleep`)
// fallback isn't implemented — that table doesn't exist yet, see
// MIGRATION.md.
export async function authenticateMember(id: string, password: string): Promise<LoginResult> {
  const activeRow = await prisma.member.findUnique({ where: { id } });
  const sleepRow = activeRow ? null : await prisma.memberSleep.findUnique({ where: { id } });
  const row = activeRow ?? sleepRow;
  if (!row) return { ok: false, error: "아이디 또는 비밀번호가 일치하지 않습니다." };
  const dormant = Boolean(sleepRow);

  const config = await getMemberFormConfig();
  const now = Math.floor(Date.now() / 1000);

  if (config.loginLimitCount > 0 && row.fail_cnts >= config.loginLimitCount) {
    const unlockAt = row.fail_time + config.loginLimitMinutes * 60;
    if (unlockAt > now) {
      return {
        ok: false,
        error: `비밀번호 ${config.loginLimitCount}회 연속실패로 로그인이 일시 중지 되었습니다.`,
        lockedUntil: new Date(unlockAt * 1000),
      };
    }
  }

  if (row.auth === "N") {
    return { ok: false, error: "아직 회원 미승인 상태입니다. 관리자에게 문의 바랍니다." };
  }

  const valid = await verifyPassword(row.passwd, password);
  if (!valid) {
    const failCnts = row.fail_time + config.loginLimitMinutes * 60 < now ? 1 : row.fail_cnts + 1;
    if (dormant) await prisma.memberSleep.update({ where: { id }, data: { fail_cnts: failCnts, fail_time: now } });
    else await prisma.member.update({ where: { id }, data: { fail_cnts: failCnts, fail_time: now } });
    return { ok: false, error: "아이디 또는 비밀번호가 일치하지 않습니다." };
  }

  if (dormant && sleepRow) {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`INSERT INTO mallRN_member SELECT * FROM mallRN_member_sleep WHERE uid = ${sleepRow.uid} AND id = ${id}`;
      await tx.member.update({
        where: { id },
        data: { fail_cnts: 0, fail_time: 0, cnts: { increment: 1 }, login_time: now, sleep_time: now, nondormant_time: now },
      });
      await tx.memberSleep.delete({ where: { uid: sleepRow.uid } });
    });
    const restored = await prisma.member.findUniqueOrThrow({ where: { id } });
    return { ok: true, profile: toProfile(restored), reactivated: true };
  }

  const updated = await prisma.member.update({
    where: { id },
    data: { fail_cnts: 0, fail_time: 0, cnts: { increment: 1 }, login_time: now },
  });

  return { ok: true, profile: toProfile(updated), reactivated: false };
}

export async function getMemberProfile(id: string): Promise<MemberProfile | null> {
  const row = await prisma.member.findUnique({ where: { id } });
  return row ? toProfile(row) : null;
}

// Port of lib/checkLogin.php:34 `SELECT * FROM mallRN_member_level WHERE level = ...`
// -> $my_discount. Coupon-aware pricing still isn't implemented (see pricing.ts).
export async function getMemberDiscountPct(level: number): Promise<number> {
  const row = await prisma.memberLevel.findFirst({ where: { level } });
  return row?.discount ?? 0;
}

export type UpdateMemberInput = {
  name?: string;
  email?: string;
  tel?: string;
  cell?: string;
  postcode?: string;
  address1?: string;
  address2?: string;
  birth?: string;
  birthSl?: "N" | "S" | "L";
  gender?: "N" | "M" | "F";
  marry?: "N" | "M" | "S";
  hobby?: string;
  job?: string;
  comp?: string;
  compOwner?: string;
  compNum?: string;
  compPostcode?: string;
  compAddress1?: string;
  compAddress2?: string;
  compType?: string;
  compItem?: string;
  add?: [string, string, string, string, string];
  mailling?: boolean;
  sms?: boolean;
};

// Port of php/regist_post.php's mode=modify.
export async function updateMemberProfile(id: string, input: UpdateMemberInput): Promise<MemberProfile | null> {
  const now = Math.floor(Date.now() / 1000);
  const config = await getMemberFormConfig();
  const requiredError = validateConfiguredMemberFields(config, input as RegisterMemberInput);
  if (requiredError) throw new Error(requiredError);
  const row = await prisma.member.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.tel !== undefined && { tel: input.tel }),
      ...(input.cell !== undefined && { cell: input.cell }),
      ...(input.postcode !== undefined && { postcode: input.postcode }),
      ...(input.address1 !== undefined && { address1: input.address1 }),
      ...(input.address2 !== undefined && { address2: input.address2 }),
      ...(input.birth !== undefined && { birth: input.birth }),
      ...(input.birthSl !== undefined && { birth_sl: input.birthSl }),
      ...(input.gender !== undefined && { gender: input.gender }),
      ...(input.marry !== undefined && { marry: input.marry }),
      ...(input.hobby !== undefined && { hobby: input.hobby }),
      ...(input.job !== undefined && { job: input.job }),
      ...(input.comp !== undefined && { comp: input.comp }),
      ...(input.compOwner !== undefined && { comp_owner: input.compOwner }),
      ...(input.compNum !== undefined && { comp_num: input.compNum }),
      ...(input.compPostcode !== undefined && { comp_postcode: input.compPostcode }),
      ...(input.compAddress1 !== undefined && { comp_address1: input.compAddress1 }),
      ...(input.compAddress2 !== undefined && { comp_address2: input.compAddress2 }),
      ...(input.compType !== undefined && { comp_type: input.compType }),
      ...(input.compItem !== undefined && { comp_item: input.compItem }),
      ...(input.add !== undefined && { add1: input.add[0], add2: input.add[1], add3: input.add[2], add4: input.add[3], add5: input.add[4] }),
      ...(input.mailling !== undefined && { mailling: input.mailling ? "Y" : "N", mailling_date: now }),
      ...(input.sms !== undefined && { sms: input.sms ? "Y" : "N", sms_date: now }),
    },
  });
  return toProfile(row);
}

export type ChangePasswordResult = { ok: true } | { ok: false; error: string };

// Port of php/regist_post.php's mode=passwd.
export async function changeMemberPassword(
  id: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const row = await prisma.member.findUnique({ where: { id }, select: { passwd: true, sns_type: true } });
  if (!row) return { ok: false, error: "등록된 회원이 아닙니다." };

  if (!row.sns_type) {
    const valid = await verifyPassword(row.passwd, currentPassword);
    if (!valid) return { ok: false, error: "비밀번호가 일치 하지 않습니다." };
  }

  await prisma.member.update({ where: { id }, data: { passwd: await hashPassword(newPassword) } });
  return { ok: true };
}

export type WithdrawResult = { ok: true } | { ok: false; error: string };

// Port of php/regist_post.php's mode=withdrawal. The order itself is retained
// for statutory/business history, while member-owned benefits and activity
// are removed and authored board content is anonymized. The original PHP
// performs these statements one by one; this port makes them atomic.
export async function withdrawMember(
  id: string,
  currentPassword: string,
  reason: string,
  message = "",
): Promise<WithdrawResult> {
  const row = await prisma.member.findUnique({
    where: { id },
    select: { level: true, passwd: true, sns_type: true, name: true, mobile: true },
  });
  if (!row) return { ok: false, error: "등록된 회원이 아닙니다." };
  if (row.level >= 99) return { ok: false, error: "관리자는 회원탈퇴가 되지 않습니다." };

  if (!row.sns_type) {
    const valid = await verifyPassword(row.passwd, currentPassword);
    if (!valid) return { ok: false, error: "비밀번호가 일치 하지 않습니다." };
  }

  if (!reason.trim()) return { ok: false, error: "탈퇴사유를 선택해 주세요." };

  const now = Math.floor(Date.now() / 1000);
  const anonymizedPassword = await hashPassword(crypto.randomUUID());

  await prisma.$transaction(async (tx) => {
    const orderCount = await tx.orderInfo.count({ where: { id } });

    await tx.memberWithdrawal.create({
      data: {
        id,
        name: row.name,
        reason: reason.trim().slice(0, 50),
        order_cnt: orderCount,
        message,
        mobile: row.mobile,
        signdate: now,
      },
    });

    await Promise.all([
      tx.orderInfo.updateMany({ where: { id }, data: { id: "" } }),
      tx.orderCashReceipt.updateMany({ where: { id }, data: { id: "" } }),
      tx.orderLog.updateMany({ where: { id }, data: { id: "" } }),
      tx.coupon.deleteMany({ where: { id } }),
      tx.mileage.deleteMany({ where: { id } }),
      tx.keywordRecent.deleteMany({ where: { id } }),
      tx.goodsRecentView.deleteMany({ where: { check_id: id } }),
      tx.goodsView.deleteMany({ where: { check_id: id } }),
      tx.review.deleteMany({ where: { id } }),
      tx.inquiry.deleteMany({ where: { id } }),
      tx.favoriteGoods.deleteMany({ where: { id } }),
      tx.favoriteStore.deleteMany({ where: { id } }),
      // Next.js stores a logged-in cart under the plain member id. PHP used
      // base64(id); deleting it prevents a later account with the same id
      // from inheriting an abandoned cart.
      tx.cart.deleteMany({ where: { cart_id: id } }),
      tx.boardPost.updateMany({ where: { id }, data: { id: "", passwd: anonymizedPassword } }),
      tx.boardComment.updateMany({ where: { id }, data: { id: "", passwd: anonymizedPassword } }),
    ]);

    await tx.member.delete({ where: { id } });
  });
  return { ok: true };
}

// Port of plugin/social/*_login.php's find-or-create-by-sns_id step (each
// provider's callback does the same lookup after exchanging its own token).
export async function findOrCreateSocialMember(
  snsType: string,
  snsId: string,
  profile: { name: string; email?: string },
): Promise<MemberProfile> {
  const existing = await prisma.member.findFirst({ where: { sns_type: snsType, sns_id: snsId } });
  if (existing) return toProfile(existing);

  const now = Math.floor(Date.now() / 1000);
  const generatedId = `${snsType}_${snsId}`.slice(0, 50);
  const row = await prisma.member.create({
    data: {
      id: generatedId,
      passwd: await hashPassword(crypto.randomUUID()),
      name: profile.name,
      email: profile.email ?? "",
      sns_type: snsType,
      sns_id: snsId,
      sns_name: profile.name,
      level: 1,
      cnts: 1,
      login_time: now,
      auth: "Y",
      signdate: now,
    },
  });
  return toProfile(row);
}

function maskFromIndex(value: string, visible: number): string {
  if (!value || value.length <= visible) return value;
  return value.slice(0, visible) + "*".repeat(value.length - visible);
}

function maskCell(cell: string): string {
  const digits = cell.replace(/-/g, "");
  if (digits.length < 7) return maskFromIndex(cell, 3);
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

export type FindMemberIdResult = { ok: true; maskedId: string } | { ok: false; error: string };

// Port of php/id_search_post.php — name+email lookup, member row first then
// dormant-archive fallback (mirrors authenticateMember's own sleep
// fallback). Legacy returns the id unmasked; this repo masks it since a
// public lookup endpoint returning full ids verbatim is needless exposure.
export async function findMemberId(name: string, email: string): Promise<FindMemberIdResult> {
  const row =
    (await prisma.member.findFirst({ where: { name, email } })) ??
    (await prisma.memberSleep.findFirst({ where: { name, email } }));
  if (!row) return { ok: false, error: "일치하는 회원 정보가 없습니다." };
  return { ok: true, maskedId: maskFromIndex(row.id, 2) };
}

export type PasswordResetChannel = "email" | "sms";

export type LookupPasswordResetResult =
  | { ok: true; maskedEmail: string | null; maskedCell: string | null }
  | { ok: false; error: string };

// Port of php/passwd_search_step_json.php step1 — name+id lookup, returns
// masked contact channels so the caller can pick where to receive the code.
export async function lookupPasswordResetTargets(id: string, name: string): Promise<LookupPasswordResetResult> {
  const row = await prisma.member.findFirst({ where: { id, name } });
  if (!row) return { ok: false, error: "일치하는 회원 정보가 없습니다." };
  return {
    ok: true,
    maskedEmail: row.email ? maskFromIndex(row.email, 3) : null,
    maskedCell: row.cell ? maskCell(row.cell) : null,
  };
}

const RESET_CODE_VALID_SECONDS = 300;

export type RequestResetCodeResult = { ok: true } | { ok: false; error: string };

// Port of php/passwd_search_step_json.php step2 — issues a 6-digit code into
// the member's own auth_code/auth_code_time columns (already present on
// Member for this exact purpose) and sends it over the chosen channel.
// Never throws — a delivery failure surfaces as {ok:false}, same
// not-taking-down-the-flow discipline as notification.ts.
export async function requestPasswordResetCode(id: string, name: string, channel: PasswordResetChannel): Promise<RequestResetCodeResult> {
  const row = await prisma.member.findFirst({ where: { id, name } });
  if (!row) return { ok: false, error: "일치하는 회원 정보가 없습니다." };
  if (channel === "email" && !row.email) return { ok: false, error: "등록된 이메일이 없습니다." };
  if (channel === "sms" && !row.cell) return { ok: false, error: "등록된 휴대폰번호가 없습니다." };

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const now = Math.floor(Date.now() / 1000);
  await prisma.member.update({ where: { id }, data: { auth_code: code, auth_code_time: now } });

  const config = await getShopConfig();
  try {
    if (channel === "email") {
      const rendered = await renderPasswordResetCodeEmail({ shopName: config.basicName, code });
      const result = await sendMail({ to: row.email, subject: rendered.subject, html: rendered.html });
      if (!result.ok) return { ok: false, error: "인증코드 발송에 실패했습니다." };
    } else {
      await sendAutoSms("authcode", row.cell, { AUTHCODE: code }, config);
    }
  } catch {
    return { ok: false, error: "인증코드 발송에 실패했습니다." };
  }

  return { ok: true };
}

export type VerifyResetCodeResult = { ok: true } | { ok: false; error: string };

export async function verifyPasswordResetCode(id: string, code: string): Promise<VerifyResetCodeResult> {
  const row = await prisma.member.findFirst({ where: { id }, select: { auth_code: true, auth_code_time: true } });
  if (!row || !row.auth_code) return { ok: false, error: "인증코드를 먼저 요청해 주세요." };
  if (row.auth_code_time + RESET_CODE_VALID_SECONDS < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: "인증코드가 만료되었습니다. 다시 요청해 주세요." };
  }
  if (row.auth_code !== code) return { ok: false, error: "인증코드가 일치하지 않습니다." };
  return { ok: true };
}

export type ResetPasswordResult = { ok: true } | { ok: false; error: string };

// Port of php/passwd_search_post.php — re-verifies the code (never trusts a
// client-side "verified" flag) before writing the new password, then clears
// auth_code so it can't be replayed.
export async function resetPasswordWithCode(id: string, code: string, newPassword: string): Promise<ResetPasswordResult> {
  const verified = await verifyPasswordResetCode(id, code);
  if (!verified.ok) return verified;

  await prisma.member.update({ where: { id }, data: { passwd: await hashPassword(newPassword), auth_code: "", auth_code_time: 0 } });
  return { ok: true };
}
