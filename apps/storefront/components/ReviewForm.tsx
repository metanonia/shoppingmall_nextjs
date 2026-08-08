"use client";

import { useActionState } from "react";
import { createReviewAction, type ReviewFormState } from "@/app/my_order/actions";

export function ReviewForm({
  orderNum,
  orderGoodsUid,
  goodsUid,
}: {
  orderNum: string;
  orderGoodsUid: number;
  goodsUid: number;
}) {
  const [state, formAction, pending] = useActionState<ReviewFormState, FormData>(createReviewAction, {});
  if (state.success) return <span className="colorGray size12">후기 작성완료</span>;

  return (
    <form action={formAction} encType="multipart/form-data" style={{ marginTop: 8 }}>
      <input type="hidden" name="orderNum" value={orderNum} />
      <input type="hidden" name="orderGoodsUid" value={orderGoodsUid} />
      <input type="hidden" name="goodsUid" value={goodsUid} />
      <select name="stars" defaultValue="5" aria-label="별점">
        {[5, 4, 3, 2, 1].map((star) => (
          <option key={star} value={star}>{star}점</option>
        ))}
      </select>
      <input type="text" name="content" required placeholder="구매후기를 입력해 주세요." style={{ marginLeft: 6 }} />
      <input type="file" name="files" multiple accept=".jpg,.jpeg,.png,.gif,.webp,.pdf" />
      <button type="submit" disabled={pending} style={{ marginLeft: 6 }}>
        {pending ? "등록 중" : "후기등록"}
      </button>
      {state.error && <div className="colorRed size12">{state.error}</div>}
    </form>
  );
}
