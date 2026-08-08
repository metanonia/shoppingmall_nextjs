"use client";

import { useActionState } from "react";
import type { CouponManagerOption } from "@shoppingmall/core";
import { adjustMileageAction, issueCouponAction, type ActionState } from "@/app/(protected)/members/actions";

export function IssueCouponForm({ memberId, coupons }: { memberId: string; coupons: CouponManagerOption[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(issueCouponAction, {});

  return (
    <form action={formAction} style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="hidden" name="memberId" value={memberId} />
      <select name="couponManagerUid">
        {coupons.map((c) => (
          <option key={c.uid} value={c.uid}>
            {c.name} ({c.discountType === "P" ? `${c.discount}%` : `${c.discount.toLocaleString("en-US")}원`})
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending}>
        쿠폰 발급
      </button>
      {state.error && <span style={{ color: "#e02020", fontSize: 12 }}>{state.error}</span>}
    </form>
  );
}

export function AdjustMileageForm({ memberId }: { memberId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(adjustMileageAction, {});

  return (
    <form action={formAction} style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="hidden" name="memberId" value={memberId} />
      <input type="number" name="amount" placeholder="금액(음수=차감)" style={{ width: 140 }} required />
      <input type="text" name="reason" placeholder="사유" required />
      <button type="submit" disabled={pending}>
        마일리지 조정
      </button>
      {state.error && <span style={{ color: "#e02020", fontSize: 12 }}>{state.error}</span>}
    </form>
  );
}
