"use server";

import { revalidatePath } from "next/cache";
import {
  parseGoodsExcelBuffer,
  importGoodsExcelRow,
  type GoodsExcelImportImages,
  type GoodsExcelImportOptions,
  type GoodsExcelRawRow,
} from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";
import { saveImageFromUrl } from "@/lib/image-upload";

export type ImportRowFailure = { row: number; name: string; error: string };
export type ImportState = { error?: string; summary?: { total: number; success: number; failed: ImportRowFailure[] } };

// Shared by app/vendor/(protected)/goods/import/actions.ts — only the
// vendorId/autoApprove/commission opts differ per caller.
export async function downloadRowImages(row: GoodsExcelRawRow): Promise<GoodsExcelImportImages> {
  let image1 = "";
  if (row.image1Url) {
    const r = await saveImageFromUrl("goods", row.image1Url);
    if (r.ok) image1 = r.filename;
  }

  let image2 = image1;
  if (row.image2Url) {
    const r = await saveImageFromUrl("goods", row.image2Url);
    if (r.ok) image2 = r.filename;
  }

  let image3 = image1;
  if (row.image3Url) {
    const r = await saveImageFromUrl("goods", row.image3Url);
    if (r.ok) image3 = r.filename;
  }

  const otherImages: string[] = [];
  for (const url of row.otherImageUrls
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)) {
    const r = await saveImageFromUrl("goods", url);
    if (r.ok) otherImages.push(r.filename);
  }

  return { image1, image2, image3, otherImages };
}

export async function runGoodsExcelImport(buffer: ArrayBuffer, opts: GoodsExcelImportOptions): Promise<ImportState> {
  const parsed = await parseGoodsExcelBuffer(buffer);
  if (!parsed.headerOk) return { error: "엑셀 양식(헤더)이 올바르지 않습니다. 샘플 파일을 참고해 주세요." };
  if (parsed.rows.length === 0) return { error: "등록할 상품 데이터가 없습니다." };

  const failed: ImportRowFailure[] = [];
  let success = 0;
  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const images = await downloadRowImages(row);
    const result = await importGoodsExcelRow(row, images, opts);
    if (result.ok) success++;
    else failed.push({ row: i + 2, name: row.name, error: result.error });
  }

  return { summary: { total: parsed.rows.length, success, failed } };
}

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
