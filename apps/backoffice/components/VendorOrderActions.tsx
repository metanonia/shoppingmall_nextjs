"use client";

import { useActionState, useState } from "react";
import type { VendorOrderLineView } from "@shoppingmall/core";
import {
  vendorOrderStatus4Action,
  vendorOrderStatus5Action,
  vendorUpdateDeliveryProgressAction,
  type ActionState,
} from "@/app/vendor/(protected)/orders/[orderNum]/actions";

function ErrorText({ state }: { state: ActionState }) {
  if (!state.error) return null;
  return <div style={{ color: "#e02020", fontSize: 12, marginTop: 4 }}>{state.error}</div>;
}

// Delivery-only subset of components/OrderActions.tsx's LineStatusActions —
// no 부분환불 link, since vendor sessions never get a refund page.
export function VendorLineStatusActions({ orderNum, line }: { orderNum: string; line: VendorOrderLineView }) {
  const [status4State, status4Action, status4Pending] = useActionState<ActionState, FormData>(vendorOrderStatus4Action, {});
  const [status5State, status5Action, status5Pending] = useActionState<ActionState, FormData>(vendorOrderStatus5Action, {});

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
      <ErrorText state={status4State} />
      <ErrorText state={status5State} />
    </div>
  );
}

export function VendorDeliveryProgressForm({ orderNum, lines }: { orderNum: string; lines: VendorOrderLineView[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(vendorUpdateDeliveryProgressAction, {});
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
