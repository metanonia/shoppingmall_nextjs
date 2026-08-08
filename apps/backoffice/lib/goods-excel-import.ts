import "server-only";

import {
  importGoodsExcelRow,
  parseGoodsExcelBuffer,
  type GoodsExcelImportImages,
  type GoodsExcelImportOptions,
  type GoodsExcelRawRow,
} from "@shoppingmall/core";
import { saveImageFromUrl } from "./image-upload";

export type ImportRowFailure = { row: number; name: string; error: string };
export type ImportState = { error?: string; summary?: { total: number; success: number; failed: ImportRowFailure[] } };

async function downloadRowImages(row: GoodsExcelRawRow): Promise<GoodsExcelImportImages> {
  let image1 = "";
  if (row.image1Url) {
    const result = await saveImageFromUrl("goods", row.image1Url);
    if (result.ok) image1 = result.filename;
  }

  let image2 = image1;
  if (row.image2Url) {
    const result = await saveImageFromUrl("goods", row.image2Url);
    if (result.ok) image2 = result.filename;
  }

  let image3 = image1;
  if (row.image3Url) {
    const result = await saveImageFromUrl("goods", row.image3Url);
    if (result.ok) image3 = result.filename;
  }

  const otherImages: string[] = [];
  for (const url of row.otherImageUrls
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean)) {
    const result = await saveImageFromUrl("goods", url);
    if (result.ok) otherImages.push(result.filename);
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
