"use client";

import { useActionState } from "react";
import { partialRefundAction, type ActionState } from "@/app/(protected)/orders/[orderNum]/actions";

export function PartialRefundForm({ orderNum, ogUid }: { orderNum: string; ogUid: number }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(partialRefundAction, {});

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320 }}>
      <input type="hidden" name="orderNum" value={orderNum} />
      <input type="hidden" name="ogUid" value={ogUid} />
      <label>
        환불액(원)
        <input type="number" name="refund" defaultValue={0} required />
      </label>
      <label>
        환불액 중 마일리지 관련분(원)
        <input type="number" name="mileage" defaultValue={0} required />
      </label>
      <label>
        환불 수수료(원)
        <input type="number" name="refundFee" defaultValue={0} required />
      </label>
      <label>
        환불액 중 쿠폰 복원분(원)
        <input type="number" name="coupon" defaultValue={0} required />
      </label>
      {state.error && <div style={{ color: "#e02020", fontSize: 12 }}>{state.error}</div>}
      <button type="submit" disabled={pending}>
        {pending ? "처리 중..." : "부분환불 처리"}
      </button>
    </form>
  );
}
