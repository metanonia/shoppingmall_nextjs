"use client";

import { useActionState } from "react";
import { importDeliveryExcelAction, type DeliveryExcelState } from "@/app/(protected)/orders/delivery-excel/actions";

export function DeliveryExcelForm() {
  const [state, action, pending] = useActionState<DeliveryExcelState, FormData>(importDeliveryExcelAction, {});
  return <form action={action} style={{ display: "grid", gap: 12, maxWidth: 520 }}><label>택배사 <input name="carrier" required /></label><label>작성한 송장 엑셀 <input type="file" name="excel" accept=".xls,.xlsx" required /></label><small>다운로드한 양식을 Excel 97-2003(.xls) 또는 Excel 통합문서(.xlsx)로 저장해 등록할 수 있습니다.</small>{state.error && <p style={{ color: "red" }}>{state.error}</p>}{state.success && <p style={{ color: "green" }}>{state.success}</p>}<button disabled={pending}>{pending ? "등록 중..." : "송장번호 일괄 등록"}</button></form>;
}
