"use client";

import { useActionState } from "react";
import { cancelOrderAction, type CancelOrderFormState } from "@/app/my_order/actions";

export function CancelOrderButton({ orderNum }: { orderNum: string }) {
  const [state, formAction, pending] = useActionState<CancelOrderFormState, FormData>(cancelOrderAction, {});

  if (state.success) return <div className="colorRed">주문이 취소되었습니다.</div>;

  return (
    <form action={formAction}>
      <input type="hidden" name="orderNum" value={orderNum} />
      {state.error && <div className="colorRed size12">{state.error}</div>}
      <button type="submit" disabled={pending}>
        주문취소
      </button>
    </form>
  );
}
