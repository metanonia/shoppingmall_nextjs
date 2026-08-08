"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { submitOrderAction, type SubmitOrderFormState } from "@/app/order/actions";
import { PostcodeSearchButton } from "./PostcodeSearchButton";
import type { BankAccount } from "@shoppingmall/core";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export type OrderFormCoupon = { couponUid: number; name: string; discountAmount: number };

// Port of php/order.php. Legacy leaves the final total to be recomputed
// blind server-side; this shows a live preview client-side (coupon/mileage
// selection change the total before submit) using discount amounts the
// server already resolved — see order/actions.ts's submitOrderAction for
// the authoritative recomputation that actually decides the charge.
export function OrderForm({
  direct,
  subtotal,
  deliveryTotal,
  coupons,
  mileageBalance,
  isMember,
  defaultName,
  defaultCell,
  defaultEmail,
  defaultPostcode,
  defaultAddress1,
  defaultAddress2,
  bankTransferEnabled,
  bankAccounts,
  cardEnabled,
  phoneEnabled,
  realtimeTransferEnabled,
  virtualAccountEnabled,
  mileageOnlyEnabled,
  cashReceiptsEnabled,
  cashReceiptsRequired,
}: {
  direct: boolean;
  subtotal: number;
  deliveryTotal: number;
  coupons: OrderFormCoupon[];
  mileageBalance: number;
  isMember: boolean;
  defaultName: string;
  defaultCell: string;
  defaultEmail: string;
  defaultPostcode: string;
  defaultAddress1: string;
  defaultAddress2: string;
  bankTransferEnabled: boolean;
  bankAccounts: BankAccount[];
  cardEnabled: boolean;
  phoneEnabled: boolean;
  realtimeTransferEnabled: boolean;
  virtualAccountEnabled: boolean;
  mileageOnlyEnabled: boolean;
  cashReceiptsEnabled: boolean;
  cashReceiptsRequired: boolean;
}) {
  const [state, formAction, pending] = useActionState<SubmitOrderFormState, FormData>(submitOrderAction, {});
  const [couponUid, setCouponUid] = useState(0);
  const [useMileageInput, setUseMileageInput] = useState(0);
  const postcodeRef = useRef<HTMLInputElement>(null);
  const address1Ref = useRef<HTMLInputElement>(null);
  const address2Ref = useRef<HTMLInputElement>(null);

  const couponDiscount = coupons.find((c) => c.couponUid === couponUid)?.discountAmount ?? 0;
  const preDiscountTotal = subtotal + deliveryTotal - couponDiscount;
  // Mileage-only (M) requires the balance to cover the whole order — partial
  // mileage use alongside another payment method is still supported (see
  // useMileage below), only the dedicated "M" radio auto-maxes the input.
  const canPayEntirelyByMileage = mileageOnlyEnabled && mileageBalance >= preDiscountTotal;

  const payOptions = useMemo(
    () => [
      { value: "B" as const, label: "무통장입금", enabled: bankTransferEnabled },
      { value: "C" as const, label: "신용카드", enabled: cardEnabled },
      { value: "H" as const, label: "휴대폰", enabled: phoneEnabled },
      { value: "R" as const, label: "실시간계좌이체", enabled: realtimeTransferEnabled },
      { value: "V" as const, label: "가상계좌", enabled: virtualAccountEnabled },
      { value: "M" as const, label: "마일리지 전액결제", enabled: canPayEntirelyByMileage },
    ],
    [bankTransferEnabled, cardEnabled, phoneEnabled, realtimeTransferEnabled, virtualAccountEnabled, canPayEntirelyByMileage],
  );
  const noPaymentMethodAvailable = payOptions.every((opt) => !opt.enabled);

  const [payType, setPayType] = useState<"B" | "C" | "H" | "R" | "V" | "M">(
    () => payOptions.find((opt) => opt.enabled)?.value ?? "M",
  );

  const maxMileage = Math.max(0, Math.min(mileageBalance, preDiscountTotal));
  const useMileage = payType === "M" ? Math.min(preDiscountTotal, mileageBalance) : Math.min(useMileageInput, maxMileage);
  const total = Math.max(0, preDiscountTotal - useMileage);

  return (
    <form action={formAction}>
      <input type="hidden" name="direct" value={direct ? "1" : "0"} />
      <input type="hidden" name="couponUid" value={couponUid} />
      <input type="hidden" name="useMileage" value={useMileage} />
      <input type="hidden" name="clientPayTotal" value={total} />
      <input type="hidden" name="payType" value={payType} />

      <div className="sub_title">주문자 정보</div>
      <input type="text" name="name" defaultValue={defaultName} placeholder="이름" required />
      <input type="text" name="cell" defaultValue={defaultCell} placeholder="연락처" required />
      <input type="email" name="email" defaultValue={defaultEmail} placeholder="이메일" />

      {!isMember && (
        <>
          <div className="empty10" />
          <input type="password" name="guestPasswd" placeholder="주문조회용 비밀번호 (4자 이상)" required minLength={4} />
        </>
      )}

      <div className="empty20" />
      <div className="sub_title">배송지</div>
      <input type="text" name="name2" placeholder="수취인명 (주문자와 동일시 비워두세요)" />
      <input type="text" name="cell2" placeholder="수취인 연락처 (주문자와 동일시 비워두세요)" />
      <input type="text" name="postcode" defaultValue={defaultPostcode} placeholder="우편번호" ref={postcodeRef} readOnly />
      <PostcodeSearchButton postcodeRef={postcodeRef} address1Ref={address1Ref} address2Ref={address2Ref} />
      <input type="text" name="address1" defaultValue={defaultAddress1} placeholder="주소" required ref={address1Ref} readOnly />
      <input type="text" name="address2" defaultValue={defaultAddress2} placeholder="상세주소" ref={address2Ref} />
      <textarea name="message" placeholder="배송 요청사항" />

      {isMember && (
        <>
          <div className="empty20" />
          <div className="sub_title">쿠폰 / 마일리지</div>
          <select value={couponUid} onChange={(e) => setCouponUid(Number(e.target.value))}>
            <option value={0}>쿠폰 사용 안함</option>
            {coupons.map((c) => (
              <option key={c.couponUid} value={c.couponUid}>
                {c.name} (-{formatWon(c.discountAmount)}원)
              </option>
            ))}
          </select>
          <div className="empty10" />
          <input
            type="number"
            min={0}
            max={maxMileage}
            value={payType === "M" ? maxMileage : useMileageInput}
            disabled={payType === "M"}
            onChange={(e) => setUseMileageInput(Math.max(0, Number(e.target.value) || 0))}
          />
          <span className="size12 colorGray"> 보유 마일리지 {formatWon(mileageBalance)} (최대 {formatWon(maxMileage)} 사용 가능)</span>
        </>
      )}

      <div className="empty20" />
      <div className="sub_title">결제수단</div>
      {payOptions.map((opt) => (
        <label key={opt.value} style={{ marginRight: 12 }}>
          <input
            type="radio"
            name="payTypeChoice"
            checked={payType === opt.value}
            disabled={!opt.enabled}
            onChange={() => setPayType(opt.value)}
          />
          {opt.label}
        </label>
      ))}
      {payType === "B" && bankTransferEnabled && (
        <div style={{ marginTop: 12 }}>
          <select name="remittanceBank" required defaultValue="">
            <option value="" disabled>입금계좌를 선택하세요.</option>
            {bankAccounts.map((bank) => {
              const value = `${bank.bankName} ${bank.bankNum} ${bank.bankOwner}`;
              return <option key={`${bank.bankName}-${bank.bankNum}`} value={value}>{value}</option>;
            })}
          </select>
          <input type="text" name="remittanceName" placeholder="입금자명" required style={{ marginLeft: 8 }} />
        </div>
      )}
      {cashReceiptsEnabled && ["B", "R", "V"].includes(payType) && (
        <div style={{ marginTop: 12 }}>
          <select name="cashReceiptType" required={cashReceiptsRequired} defaultValue="">
            <option value="">현금영수증 신청 안함</option>
            <option value="1">소득공제용</option>
            <option value="2">지출증빙용</option>
          </select>
          <input name="cashReceiptNumber" required={cashReceiptsRequired} placeholder="휴대폰번호 또는 사업자등록번호" />
        </div>
      )}
      {noPaymentMethodAvailable && (
        <div className="colorRed size12">현재 이용 가능한 결제수단이 없습니다. 관리자에게 문의해주세요.</div>
      )}

      <div className="empty30" />
      <div className="totalPrice">
        상품금액 {formatWon(subtotal)}원 + 배송비 {formatWon(deliveryTotal)}원 - 쿠폰 {formatWon(couponDiscount)}원 - 마일리지{" "}
        {formatWon(useMileage)}원 = <span className="total_price">{formatWon(total)}</span>원
      </div>

      {state.error && <div className="colorRed">{state.error}</div>}

      <div className="empty20" />
      <button className="shineButtonBlack" type="submit" disabled={pending || noPaymentMethodAvailable}>
        결제하기
      </button>
    </form>
  );
}
