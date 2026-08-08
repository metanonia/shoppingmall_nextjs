"use server";

import { importDeliveryExcel } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export type DeliveryExcelState = { error?: string; success?: string };

export async function importDeliveryExcelAction(_previous: DeliveryExcelState, formData: FormData): Promise<DeliveryExcelState> {
  const session = await requireAdmin();
  const file = formData.get("excel");
  if (!(file instanceof File) || file.size === 0) return { error: "엑셀 파일을 선택해 주세요." };
  if (!/\.xlsx?$/i.test(file.name)) return { error: "Excel 파일(.xls, .xlsx)만 가능합니다." };
  let result: Awaited<ReturnType<typeof importDeliveryExcel>>;
  try {
    result = await importDeliveryExcel(await file.arrayBuffer(), String(formData.get("carrier") ?? ""), session.userId);
  } catch {
    return { error: "엑셀 파일을 읽을 수 없습니다. 다운로드한 양식을 사용해 주세요." };
  }
  return result.ok ? { success: `${result.updated}건의 송장번호를 등록했습니다.` } : { error: result.error };
}
