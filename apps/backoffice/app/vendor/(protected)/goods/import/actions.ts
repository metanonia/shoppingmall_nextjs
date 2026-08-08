"use server";

import { revalidatePath } from "next/cache";
import { getVendorProfile } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";
import { runGoodsExcelImport, type ImportState } from "@/lib/goods-excel-import";

// Vendor twin of app/(protected)/goods/import/actions.ts — forces vendor to
// the caller's own id, derives auto-approval from Vendor.goods_auth (same
// pattern as app/vendor/(protected)/goods/actions.ts's createVendorGoodsAction).
export async function importVendorGoodsExcelAction(_prevState: ImportState, formData: FormData): Promise<ImportState> {
  const session = await requireVendor();
  const vendorId = session.vendorId ?? "";
  const file = formData.get("excel");
  if (!(file instanceof File) || file.size === 0) return { error: "엑셀 파일을 선택해 주세요." };

  const profile = await getVendorProfile(vendorId);
  const result = await runGoodsExcelImport(await file.arrayBuffer(), {
    vendorId,
    autoApprove: profile?.goodsAuth === "A",
    commissionType: 0,
    commission: 0,
    vendorHide: false,
  });
  if (result.summary && result.summary.success > 0) revalidatePath("/vendor/goods");
  return result;
}
