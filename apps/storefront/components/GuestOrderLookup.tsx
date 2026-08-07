"use client";

import { useActionState, useState } from "react";
import {
  cancelGuestOrderAction,
  lookupGuestOrderAction,
  type CancelGuestOrderState,
  type GuestOrderLookupState,
} from "@/app/my_order/guest/actions";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

const PAY_TYPE_LABELS: Record<string, string> = { B: "무통장입금", C: "카드", R: "실시간계좌이체", V: "가상계좌", H: "휴대폰", M: "마일리지" };

export function GuestOrderLookup() {
  const [lookupState, lookupAction, lookupPending] = useActionState<GuestOrderLookupState, FormData>(
    lookupGuestOrderAction,
    {},
  );
  const [cancelState, cancelAction, cancelPending] = useActionState<CancelGuestOrderState, FormData>(
    cancelGuestOrderAction,
    {},
  );
  const [orderNum, setOrderNum] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPasswd, setGuestPasswd] = useState("");

  const detail = lookupState.detail;
  const canCancel = detail?.lines.some((l) => l.status !== 9) && !cancelState.success;

  return (
    <div>
      <form action={lookupAction}>
        <input type="text" name="orderNum" placeholder="주문번호" value={orderNum} onChange={(e) => setOrderNum(e.target.value)} required />
        <input type="text" name="guestName" placeholder="주문자명" value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
        <input
          type="password"
          name="guestPasswd"
          placeholder="주문조회 비밀번호"
          value={guestPasswd}
          onChange={(e) => setGuestPasswd(e.target.value)}
          required
        />
        <button type="submit" disabled={lookupPending}>
          조회
        </button>
      </form>

      {lookupState.error && <div className="colorRed">{lookupState.error}</div>}

      {detail && (
        <div>
          <div className="empty20" />
          <div className="sub_title">주문번호 {detail.orderNum}</div>
          <p>결제수단: {PAY_TYPE_LABELS[detail.payType] ?? detail.payType}</p>
          <table style={{ width: "100%" }}>
            <tbody>
              {detail.lines.map((line) => (
                <tr key={line.ogUid}>
                  <td>
                    {line.goodsName} {line.optionValue && `(${line.optionValue})`} x {line.qty}
                  </td>
                  <td>{formatWon(line.lineTotal)}원</td>
                  <td>{line.statusLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="totalPrice">
            결제금액 <span className="total_price">{formatWon(detail.payTotal)}</span>원
          </div>

          {cancelState.success ? (
            <div className="colorRed">주문이 취소되었습니다.</div>
          ) : (
            canCancel && (
              <form action={cancelAction}>
                <input type="hidden" name="orderNum" value={orderNum} />
                <input type="hidden" name="guestName" value={guestName} />
                <input type="hidden" name="guestPasswd" value={guestPasswd} />
                {cancelState.error && <div className="colorRed size12">{cancelState.error}</div>}
                <button type="submit" disabled={cancelPending}>
                  주문취소
                </button>
              </form>
            )
          )}
        </div>
      )}
    </div>
  );
}
