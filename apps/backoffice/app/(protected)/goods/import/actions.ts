"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { runGoodsExcelImport, type ImportState } from "@/lib/goods-excel-import";

export type { ImportState } from "@/lib/goods-excel-import";

export async function importGoodsExcelAction(_prevState: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();
  const file = formData.get("excel");
  if (!(file instanceof File) || file.size === 0) return { error: "엑셀 파일을 선택해 주세요." };

  const result = await runGoodsExcelImport(await file.arrayBuffer(), {
    vendorId: "",
    autoApprove: true,
    commissionType: 0,
    commission: 0,
    vendorHide: false,
  });
  if (result.summary && result.summary.success > 0) revalidatePath("/goods");
  return result;
}
