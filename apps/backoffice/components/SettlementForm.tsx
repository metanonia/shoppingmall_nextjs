"use client";

import { useActionState } from "react";
import { confirmSettlementAction, type ActionState } from "@/app/(protected)/vendors/[uid]/settlement/actions";

export function ConfirmSettlementForm({
  vendorUid,
  dateFrom,
  dateTo,
  bankName,
  bankNum,
  bankOwner,
}: {
  vendorUid: number;
  dateFrom: string;
  dateTo: string;
  bankName: string;
  bankNum: string;
  bankOwner: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(confirmSettlementAction, {});

  return (
    <form action={formAction} style={{ border: "1px solid #eee", padding: 12, borderRadius: 6, display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
      <input type="hidden" name="vendorUid" value={vendorUid} />
      <input type="hidden" name="dateFrom" value={dateFrom} />
      <input type="hidden" name="dateTo" value={dateTo} />
      <input type="text" name="bankName" placeholder="은행명" defaultValue={bankName} />
      <input type="text" name="bankNum" placeholder="계좌번호" defaultValue={bankNum} />
      <input type="text" name="bankOwner" placeholder="예금주" defaultValue={bankOwner} />
      {state.error && <div style={{ color: "#e02020", fontSize: 12 }}>{state.error}</div>}
      {state.success && <div style={{ color: "#2a8", fontSize: 12 }}>정산이 확정되었습니다.</div>}
      <button type="submit" disabled={pending}>
        {pending ? "처리 중..." : "정산 확정"}
      </button>
    </form>
  );
}
