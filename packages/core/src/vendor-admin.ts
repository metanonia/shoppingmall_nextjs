import { prisma } from "@shoppingmall/db";

function now(): number {
  return Math.floor(Date.now() / 1000);
}

function dateToUnix(dateStr: string, endOfDay = false): number {
  return Math.floor(new Date(`${dateStr}T${endOfDay ? "23:59:59" : "00:00:00"}`).getTime() / 1000);
}

export type AdminVendorListItem = {
  uid: number;
  id: string;
  compName: string;
  compOwner: string;
  contCell: string;
  auth: "R" | "Y" | "N";
  signdate: number;
};

export type AdminVendorListFilters = { keyword?: string; auth?: "R" | "Y" | "N" };

// Port of vendor/vendor_list.php's (admin-side) list, keyword-only search
// per this repo's established simplification.
export async function getAdminVendorList(filters: AdminVendorListFilters): Promise<AdminVendorListItem[]> {
  const where = {
    ...(filters.keyword
      ? { OR: [{ id: { contains: filters.keyword } }, { comp_name: { contains: filters.keyword } }, { comp_owner: { contains: filters.keyword } }] }
      : {}),
    ...(filters.auth ? { auth: filters.auth } : {}),
  };

  const rows = await prisma.vendor.findMany({ where, orderBy: { uid: "desc" } });
  return rows.map((r) => ({
    uid: r.uid,
    id: r.id,
    compName: r.comp_name,
    compOwner: r.comp_owner,
    contCell: r.cont_cell,
    auth: r.auth,
    signdate: r.signdate,
  }));
}

export type AdminVendorDetail = AdminVendorListItem & { bankName: string; bankNum: string; bankOwner: string };

export async function getAdminVendorByUid(vendorUid: number): Promise<AdminVendorDetail | null> {
  const r = await prisma.vendor.findFirst({ where: { uid: vendorUid } });
  if (!r) return null;
  return {
    uid: r.uid,
    id: r.id,
    compName: r.comp_name,
    compOwner: r.comp_owner,
    contCell: r.cont_cell,
    auth: r.auth,
    signdate: r.signdate,
    bankName: r.bank_name,
    bankNum: r.bank_num,
    bankOwner: r.bank_owner,
  };
}

export type VendorAdminResult = { ok: true } | { ok: false; error: string };

// Port of vendor approval toggle (managers/vendor's auth field switch) —
// approve (Y) / reject (N) a pending (R) vendor application.
export async function updateVendorAuth(vendorUid: number, auth: "R" | "Y" | "N"): Promise<VendorAdminResult> {
  const updated = await prisma.vendor.updateMany({ where: { uid: vendorUid }, data: { auth } });
  if (updated.count === 0) return { ok: false, error: "존재하지 않는 입점사입니다." };
  return { ok: true };
}

export type VendorSalesPreview = {
  goodsTotal: number;
  commissionTotal: number;
  payoutTotal: number;
  lineCount: number;
};

// Port of managers/vendor/calculate_amount.php's totals-only preview — the
// admin picks a period, sees what a settlement run would produce, before
// committing to confirmSettlement. Only confirmed-but-not-yet-settled lines
// (the same predicate confirmSettlement locks onto) are eligible.
export async function getVendorSalesPreview(vendorId: string, dateFrom: string, dateTo: string): Promise<VendorSalesPreview> {
  const lines = await prisma.orderSales.findMany({
    where: { vendor: vendorId, confirmed: 1, settled: 0, confirm_date: { gte: dateToUnix(dateFrom), lte: dateToUnix(dateTo, true) } },
  });

  const goodsTotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const commissionTotal = lines.reduce((sum, l) => sum + l.commission_amount, 0);
  return { goodsTotal, commissionTotal, payoutTotal: goodsTotal - commissionTotal, lineCount: lines.length };
}

export type ConfirmSettlementInput = { bankName: string; bankNum: string; bankOwner: string };

// Port of managers/vendor/calculate_post_json.php's `adjustment=1` commit —
// atomically inserts the SalesCalculate batch record and marks every line it
// covers as settled, so a line can never be counted in two settlement runs.
export async function confirmSettlement(
  vendorId: string,
  dateFrom: string,
  dateTo: string,
  bankInfo: ConfirmSettlementInput,
): Promise<VendorAdminResult> {
  const vendor = await prisma.vendor.findFirst({ where: { id: vendorId } });
  if (!vendor) return { ok: false, error: "존재하지 않는 입점사입니다." };

  const where = { vendor: vendorId, confirmed: 1, settled: 0, confirm_date: { gte: dateToUnix(dateFrom), lte: dateToUnix(dateTo, true) } };
  const lines = await prisma.orderSales.findMany({ where });
  if (lines.length === 0) return { ok: false, error: "정산할 확정 매출이 없습니다." };

  const goodsTotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const commissionTotal = lines.reduce((sum, l) => sum + l.commission_amount, 0);

  await prisma.$transaction(async (tx) => {
    await tx.salesCalculate.create({
      data: {
        vendor: vendorId,
        vendor_name: vendor.comp_name,
        date_from: dateFrom,
        date_to: dateTo,
        goods_total: goodsTotal,
        commission_total: commissionTotal,
        payout_total: goodsTotal - commissionTotal,
        bank_name: bankInfo.bankName,
        bank_num: bankInfo.bankNum,
        bank_owner: bankInfo.bankOwner,
        signdate: now(),
      },
    });
    await tx.orderSales.updateMany({ where, data: { settled: 1 } });
  });

  return { ok: true };
}

export type VendorSalesCalculateItem = {
  uid: number;
  dateFrom: string;
  dateTo: string;
  goodsTotal: number;
  commissionTotal: number;
  payoutTotal: number;
  bankName: string;
  bankNum: string;
  bankOwner: string;
  signdate: number;
};

// Vendor-facing read-only history of confirmed settlement batches — no
// tax-bill/status toggle here, per the scope cut in Phase 8's plan.
export async function getVendorSalesCalculateList(vendorId: string): Promise<VendorSalesCalculateItem[]> {
  const rows = await prisma.salesCalculate.findMany({ where: { vendor: vendorId }, orderBy: { uid: "desc" } });
  return rows.map((r) => ({
    uid: r.uid,
    dateFrom: r.date_from,
    dateTo: r.date_to,
    goodsTotal: r.goods_total,
    commissionTotal: r.commission_total,
    payoutTotal: r.payout_total,
    bankName: r.bank_name,
    bankNum: r.bank_num,
    bankOwner: r.bank_owner,
    signdate: r.signdate,
  }));
}
