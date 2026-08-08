"use client";

import { useActionState } from "react";
import { requestGuestOrderChangeAction, type GuestOrderChangeState } from "@/app/my_order/guest/actions";

export function GuestOrderChangeForm(props: { orderNum: string; ogUid: number; status: number; guestName: string; guestPasswd: string }) {
  const [state, action, pending] = useActionState<GuestOrderChangeState, FormData>(requestGuestOrderChangeAction, {});
  const types = props.status === 1 || props.status === 2 ? [{ value: 9, label: "취소" }] : props.status >= 3 && props.status <= 5 ? [{ value: 7, label: "교환" }, { value: 8, label: "반품" }] : [];
  if (!types.length) return null;
  return <form action={action} style={{ display: "flex", flexDirection: "column", gap: 4 }}><input type="hidden" name="orderNum" value={props.orderNum} /><input type="hidden" name="ogUid" value={props.ogUid} /><input type="hidden" name="guestName" value={props.guestName} /><input type="hidden" name="guestPasswd" value={props.guestPasswd} /><select name="type">{types.map((item) => <option key={item.value} value={item.value}>{item.label} 요청</option>)}</select><input name="reason" placeholder="요청 사유" required /><input name="bankInfo" placeholder="환불계좌(은행|계좌|예금주)" /><textarea name="message" placeholder="상세내용" /><button disabled={pending}>접수</button>{state.error && <span className="colorRed size12">{state.error}</span>}{state.success && <span className="size12">접수되었습니다.</span>}</form>;
}
