"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Device, PaymentRequestResult } from "@shoppingmall/core";
import { abandonPendingPayment, getPendingPaymentStatus } from "@/app/order/pay/actions";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// Port of skin/seriesWhite/js/orderProc.js's cp_proc()/mobile_cp_proc()/
// npay_ck() — the popup-open + close-poll dance for PC, full-page redirect
// for mobile. Works identically for the real AronhubPaymentGateway
// (kind: "form-post") and the local MockPaymentGateway (kind: "redirect").
export function PaymentWidget({
  orderNum,
  token,
  paymentRequest,
  payTotal,
  device,
}: {
  orderNum: string;
  token: string;
  paymentRequest: PaymentRequestResult;
  payTotal: number;
  device: Device;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const popupRef = useRef<Window | null>(null);
  const [status, setStatus] = useState<"idle" | "waiting" | "abandoned">("idle");

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "payment-complete" && e.data?.orderNum === orderNum) {
        router.push(`/order/complete?order_num=${orderNum}`);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [orderNum, router]);

  useEffect(() => {
    if (device === "mobile") return;
    // PC popup-closed poll — legacy's npay_ck() does the same 1s interval.
    const interval = setInterval(async () => {
      if (!popupRef.current || !popupRef.current.closed) return;
      clearInterval(interval);
      const current = await getPendingPaymentStatus(orderNum, token);
      if (current?.payStatus === "C") {
        router.push(`/order/complete?order_num=${orderNum}`);
        return;
      }
      await abandonPendingPayment(orderNum, token);
      setStatus("abandoned");
    }, 1000);
    return () => clearInterval(interval);
  }, [device, orderNum, token, router]);

  useEffect(() => {
    if (device !== "mobile") return;
    // Mobile has no popup — detect "came back via bfcache without paying"
    // the same way mobile_order.php's window.onpageshow does.
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        abandonPendingPayment(orderNum, token).then(() => setStatus("abandoned"));
      }
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [device, orderNum, token]);

  function startPayment() {
    setStatus("waiting");
    if (device === "pc") {
      popupRef.current = window.open("", "pop_check_go", "width=700,height=710");
      if (paymentRequest.kind === "form-post") {
        formRef.current?.submit();
      } else if (popupRef.current) {
        popupRef.current.location.href = paymentRequest.url;
      }
      return;
    }
    // Mobile: full-page, no popup.
    if (paymentRequest.kind === "form-post") {
      formRef.current?.submit();
    } else {
      window.location.href = paymentRequest.url;
    }
  }

  return (
    <div>
      <p>
        결제금액 <strong>{formatWon(payTotal)}원</strong>
      </p>

      {paymentRequest.kind === "form-post" && (
        <form
          ref={formRef}
          action={paymentRequest.actionUrl}
          method="POST"
          target={device === "pc" ? "pop_check_go" : "_self"}
        >
          {Object.entries(paymentRequest.fields).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
        </form>
      )}

      {status === "abandoned" ? (
        <>
          <div className="colorRed">결제가 완료되지 않아 주문이 취소되었습니다. 장바구니에서 다시 담아 주문해주세요.</div>
          <a className="shineButtonBlack" href="/cart">
            장바구니로 돌아가기
          </a>
        </>
      ) : (
        <button className="shineButtonBlack" type="button" onClick={startPayment} disabled={status === "waiting"}>
          {status === "waiting" ? "결제 진행 중..." : "결제 진행"}
        </button>
      )}
    </div>
  );
}
