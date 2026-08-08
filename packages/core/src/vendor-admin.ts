import { prisma } from "@shoppingmall/db";

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
// per this repo's established simplification. Settlement/statistics stay
// out of scope — see MIGRATION.md (Phase 8, needs mallRN_sales_calculate
// and similar tables this migration hasn't ported).
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

export type VendorAdminResult = { ok: true } | { ok: false; error: string };

// Port of vendor approval toggle (managers/vendor's auth field switch) —
// approve (Y) / reject (N) a pending (R) vendor application.
export async function updateVendorAuth(vendorUid: number, auth: "R" | "Y" | "N"): Promise<VendorAdminResult> {
  const updated = await prisma.vendor.updateMany({ where: { uid: vendorUid }, data: { auth } });
  if (updated.count === 0) return { ok: false, error: "존재하지 않는 입점사입니다." };
  return { ok: true };
}
