"use server";

import { revalidatePath } from "next/cache";
import { getShopConfig, importMemberExcelRow, parseMemberExcelBuffer } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export type ImportRowFailure = { row: number; name: string; error: string };
export type ImportState = { error?: string; summary?: { total: number; success: number; failed: ImportRowFailure[] } };

export async function importMemberExcelAction(_prevState: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();
  const file = formData.get("excel");
  if (!(file instanceof File) || file.size === 0) return { error: "엑셀 파일을 선택해 주세요." };

  const parsed = await parseMemberExcelBuffer(await file.arrayBuffer());
  if (!parsed.headerOk) return { error: "엑셀 양식(헤더)이 올바르지 않습니다. 샘플 파일을 참고해 주세요." };
  if (parsed.rows.length === 0) return { error: "등록할 회원 데이터가 없습니다." };

  const config = await getShopConfig();
  const mileageConfig = {
    memberMileageValidityYn: config.memberMileageValidityYn,
    memberMileageValidity: config.memberMileageValidity,
    memberMileageValidityType: config.memberMileageValidityType,
  };

  const failed: ImportRowFailure[] = [];
  let success = 0;
  for (let i = 0; i < parsed.rows.length; i++) {
    const row = parsed.rows[i];
    const result = await importMemberExcelRow(row, mileageConfig);
    if (result.ok) success++;
    else failed.push({ row: i + 2, name: row.name, error: result.error });
  }

  if (success > 0) revalidatePath("/members");
  return { summary: { total: parsed.rows.length, success, failed } };
}
