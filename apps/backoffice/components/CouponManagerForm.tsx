"use client";

import { useActionState, useState } from "react";
import { createCouponManagerAction, updateCouponManagerAction, type ActionState } from "@/app/(protected)/coupons/actions";

function toDateInputValue(d: Date | null): string {
  if (!d || d.getFullYear() <= 1000) return "";
  return d.toISOString().slice(0, 10);
}

export function CouponManagerForm({
  initial,
}: {
  initial: {
    uid: number;
    name: string;
    discount: number;
    discountType: "P" | "W";
    discountLimit: number;
    useSDate: Date | null;
    useEDate: Date | null;
    useDay: number;
    useType: number;
    useLimit: number;
  } | null;
}) {
  const action = initial ? updateCouponManagerAction : createCouponManagerAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [useType, setUseType] = useState(initial?.useType ?? 0);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 420 }}>
      {initial && <input type="hidden" name="uid" value={initial.uid} />}
      <input type="text" name="name" placeholder="쿠폰명" defaultValue={initial?.name} required />
      <div style={{ display: "flex", gap: 6 }}>
        <input type="number" name="discount" placeholder="할인값" defaultValue={initial?.discount} required />
        <select name="discountType" defaultValue={initial?.discountType ?? "P"}>
          <option value="P">정률(%)</option>
          <option value="W">정액(원)</option>
        </select>
      </div>
      <input type="number" name="discountLimit" placeholder="정률 할인 시 최대 할인금액(0=제한없음)" defaultValue={initial?.discountLimit ?? 0} />

      <div>
        <label style={{ marginRight: 12 }}>
          <input type="radio" name="useType" value={0} checked={useType === 0} onChange={() => setUseType(0)} /> 고정 만료일
        </label>
        <label>
          <input type="radio" name="useType" value={1} checked={useType === 1} onChange={() => setUseType(1)} /> 발급일로부터 N일
        </label>
      </div>
      {useType === 0 ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="date" name="useSDate" defaultValue={toDateInputValue(initial?.useSDate ?? null)} />
          ~
          <input type="date" name="useEDate" defaultValue={toDateInputValue(initial?.useEDate ?? null)} />
        </div>
      ) : (
        <input type="number" name="useDay" placeholder="발급일로부터 유효 일수" defaultValue={initial?.useDay ?? 30} />
      )}

      <input type="number" name="useLimit" placeholder="1인당 발급 가능 횟수(0=무제한)" defaultValue={initial?.useLimit ?? 0} />

      {state.error && <div style={{ color: "#e02020" }}>{state.error}</div>}
      <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
        {pending ? "저장 중..." : initial ? "수정 저장" : "쿠폰 등록"}
      </button>
    </form>
  );
}
