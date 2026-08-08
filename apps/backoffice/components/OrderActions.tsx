"use client";

import { useActionState, useState } from "react";
import type { AdminOrderLineView } from "@shoppingmall/core";
import {
  adminCancelOrderAction,
  confirmBankTransferAction,
  orderStatus4Action,
  orderStatus5Action,
  updateAddressAction,
  updateDeliveryProgressAction,
  updateMemoAction,
  type ActionState,
} from "@/app/(protected)/orders/[orderNum]/actions";

function ErrorText({ state }: { state: ActionState }) {
  if (!state.error) return null;
  return <div style={{ color: "#e02020", fontSize: 12, marginTop: 4 }}>{state.error}</div>;
}

export function ConfirmBankTransferButton({ orderNum }: { orderNum: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(confirmBankTransferAction, {});
  return (
    <form action={formAction}>
      <input type="hidden" name="orderNum" value={orderNum} />
      <button type="submit" disabled={pending}>
        입금확인 (결제완료 처리)
      </button>
      <ErrorText state={state} />
    </form>
  );
}

export function CancelOrderButton({ orderNum, payStatus }: { orderNum: string; payStatus: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(adminCancelOrderAction, {});
  return (
    <form action={formAction}>
      <input type="hidden" name="orderNum" value={orderNum} />
      <input type="hidden" name="payStatus" value={payStatus} />
      <button type="submit" disabled={pending}>
        주문 전체취소
      </button>
      <ErrorText state={state} />
    </form>
  );
}

export function LineStatusActions({
  orderNum,
  line,
  payStatusC,
}: {
  orderNum: string;
  line: AdminOrderLineView;
  payStatusC: boolean;
}) {
  const [status4State, status4Action, status4Pending] = useActionState<ActionState, FormData>(orderStatus4Action, {});
  const [status5State, status5Action, status5Pending] = useActionState<ActionState, FormData>(orderStatus5Action, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {line.status === 3 && (
        <form action={status4Action}>
          <input type="hidden" name="orderNum" value={orderNum} />
          <input type="hidden" name="ogUid" value={line.ogUid} />
          <button type="submit" disabled={status4Pending}>
            배송완료 처리
          </button>
        </form>
      )}
      {(line.status === 3 || line.status === 4) && (
        <form action={status5Action}>
          <input type="hidden" name="orderNum" value={orderNum} />
          <input type="hidden" name="ogUid" value={line.ogUid} />
          <button type="submit" disabled={status5Pending}>
            구매확정 처리
          </button>
        </form>
      )}
      {payStatusC && line.status !== 9 && (
        <a href={`/orders/${orderNum}/refund?ogUid=${line.ogUid}`} style={{ fontSize: 12, color: "#999" }}>
          부분환불
        </a>
      )}
      <ErrorText state={status4State} />
      <ErrorText state={status5State} />
    </div>
  );
}

export function DeliveryProgressForm({ orderNum, lines }: { orderNum: string; lines: AdminOrderLineView[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateDeliveryProgressAction, {});
  const [targetStatus, setTargetStatus] = useState<"2" | "3">("2");
  const eligible = lines.filter((l) => l.status === 1 || l.status === 2);
  if (eligible.length === 0) return null;

  return (
    <form action={formAction} style={{ border: "1px solid #eee", padding: 12, borderRadius: 6, marginTop: 12 }}>
      <input type="hidden" name="orderNum" value={orderNum} />
      <div style={{ marginBottom: 8, fontWeight: 600 }}>배송 처리</div>
      {eligible.map((line) => (
        <label key={line.ogUid} style={{ display: "block", marginBottom: 4 }}>
          <input type="checkbox" name="ogUid" value={line.ogUid} /> {line.goodsName} ({line.qty}개)
        </label>
      ))}
      <div style={{ margin: "8px 0" }}>
        <label style={{ marginRight: 12 }}>
          <input type="radio" name="status" value="2" checked={targetStatus === "2"} onChange={() => setTargetStatus("2")} /> 배송준비중
        </label>
        <label>
          <input type="radio" name="status" value="3" checked={targetStatus === "3"} onChange={() => setTargetStatus("3")} /> 배송중(송장입력)
        </label>
      </div>
      {targetStatus === "3" && (
        <div style={{ marginBottom: 8 }}>
          <input type="text" name="carrier" placeholder="택배사" required style={{ marginRight: 8 }} />
          <input type="text" name="trackingNumber" placeholder="송장번호" required />
        </div>
      )}
      <button type="submit" disabled={pending}>
        적용
      </button>
      <ErrorText state={state} />
    </form>
  );
}

export function OrderMemoForm({ orderNum, memo }: { orderNum: string; memo: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateMemoAction, {});
  return (
    <form action={formAction}>
      <input type="hidden" name="orderNum" value={orderNum} />
      <textarea name="memo" defaultValue={memo} rows={3} style={{ width: "100%" }} />
      <button type="submit" disabled={pending}>
        메모 저장
      </button>
      <ErrorText state={state} />
    </form>
  );
}

export function OrderAddressForm({
  orderNum,
  postcode,
  address1,
  address2,
}: {
  orderNum: string;
  postcode: string;
  address1: string;
  address2: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateAddressAction, {});
  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 320 }}>
      <input type="hidden" name="orderNum" value={orderNum} />
      <input type="text" name="postcode" defaultValue={postcode} placeholder="우편번호" />
      <input type="text" name="address1" defaultValue={address1} placeholder="주소" />
      <input type="text" name="address2" defaultValue={address2} placeholder="상세주소" />
      <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
        배송지 저장
      </button>
      <ErrorText state={state} />
    </form>
  );
}
