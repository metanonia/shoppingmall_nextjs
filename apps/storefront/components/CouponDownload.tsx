"use client";

import { useActionState } from "react";
import type { DownloadableCoupon } from "@shoppingmall/core";
import { downloadCouponAction, type DownloadCouponFormState } from "@/app/goods/[uid]/actions";

function discountLabel(c: DownloadableCoupon): string {
  return c.discountType === "P" ? `${c.discount}%` : `${c.discount.toLocaleString("en-US")}원`;
}

// Port of the "쿠폰 다운로드" button on the product-detail page —
// coupon_manager type=4 templates applicable to this goods.
export function CouponDownload({ goodsUid, coupons, isMember }: { goodsUid: number; coupons: DownloadableCoupon[]; isMember: boolean }) {
  const [state, formAction, pending] = useActionState<DownloadCouponFormState, FormData>(downloadCouponAction, {});

  if (coupons.length === 0) return null;

  return (
    <div className="couponList">
      {coupons.map((c) => (
        <form action={formAction} key={c.couponManagerUid} style={{ display: "inline-block", marginRight: 6 }}>
          <input type="hidden" name="couponManagerUid" value={c.couponManagerUid} />
          <input type="hidden" name="goodsUid" value={goodsUid} />
          <button type="submit" disabled={pending || !isMember} title={!isMember ? "로그인 후 다운로드 가능합니다." : undefined}>
            {discountLabel(c)} 할인쿠폰 받기
          </button>
        </form>
      ))}
      {state.error && <div className="colorRed size12">{state.error}</div>}
      {state.success && <div className="colorBlue size12">쿠폰이 발급되었습니다.</div>}
    </div>
  );
}
