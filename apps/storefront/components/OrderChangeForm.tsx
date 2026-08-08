"use client";

import { useActionState } from "react";
import { cancelOrderChangeAction, requestOrderChangeAction, type OrderChangeFormState } from "@/app/my_order/actions";

export function OrderChangeForm({ orderNum, ogUid, status }: { orderNum: string; ogUid: number; status: number }) {
  const [state, action, pending] = useActionState<OrderChangeFormState, FormData>(requestOrderChangeAction, {});
  const types = status === 1 || status === 2 ? [{ value: 9, label: "취소" }] : status >= 3 && status <= 5 ? [{ value: 7, label: "교환" }, { value: 8, label: "반품" }] : [];
  if (types.length === 0) return null;
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 180 }}>
      <input type="hidden" name="orderNum" value={orderNum} />
      <input type="hidden" name="ogUid" value={ogUid} />
      <select name="type">{types.map((item) => <option key={item.value} value={item.value}>{item.label} 요청</option>)}</select>
      <input name="reason" placeholder="요청 사유" required />
      <input name="bankInfo" placeholder="환불계좌(은행|계좌|예금주)" />
      <textarea name="message" placeholder="상세 내용" rows={2} />
      <button disabled={pending}>접수</button>
      {state.error && <span className="colorRed size12">{state.error}</span>}
      {state.success && <span className="size12">요청이 접수되었습니다.</span>}
    </form>
  );
}

export function OrderChangeStatus({ request }: { request: { uid: number; status: number; status2: number; reason: string } }) {
  const [state, action, pending] = useActionState<OrderChangeFormState, FormData>(cancelOrderChangeAction, {});
  const type = request.status === 7 ? "교환" : request.status === 8 ? "반품" : "취소";
  const step: Record<number, string> = { 1: "요청", 2: "승인/처리중", 3: "회수완료", 4: "교환발송", 5: "처리완료", 9: "거절" };
  return <div className="size12"><b>{type} {step[request.status2] ?? request.status2}</b><div>{request.reason}</div>{request.status2 === 1 && <form action={action}><input type="hidden" name="uid" value={request.uid} /><button disabled={pending}>요청 철회</button></form>}{state.error && <span className="colorRed">{state.error}</span>}</div>;
}
