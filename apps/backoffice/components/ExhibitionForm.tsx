"use client";

import { useActionState } from "react";
import type { AdminExhibitionDetail } from "@shoppingmall/core";
import { createExhibitionAction, updateExhibitionAction, type ActionState } from "@/app/(protected)/exhibitions/actions";
import { imageUrl } from "@/lib/image-url";

function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function ExhibitionForm({ initial }: { initial: AdminExhibitionDetail | null }) {
  const action = initial ? updateExhibitionAction : createExhibitionAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
      {initial && <input type="hidden" name="uid" value={initial.uid} />}
      {initial && <input type="hidden" name="existingImage1" value={initial.image1} />}
      <input type="text" name="name" placeholder="기획전명" defaultValue={initial?.name} required />
      <label>
        <input type="checkbox" name="discountYn" defaultChecked={initial?.discountYn === "Y"} /> 할인 기획전
      </label>
      <input type="number" name="discount" placeholder="할인율(%)" defaultValue={initial?.discount} />
      <div style={{ display: "flex", gap: 8 }}>
        <input type="date" name="sDate" defaultValue={toDateInput(initial?.sDate ?? null)} />
        <input type="date" name="eDate" defaultValue={toDateInput(initial?.eDate ?? null)} />
      </div>
      <label>
        배너 이미지
        <input type="file" name="image1" accept="image/*" />
        {initial?.image1 && <img src={imageUrl("goods", initial.image1)} alt="" style={{ height: 40, marginLeft: 8 }} />}
      </label>
      <textarea name="explains" placeholder="설명" defaultValue={initial?.explains} rows={3} />
      <select name="status" defaultValue={initial?.status ?? 0}>
        <option value={0}>-</option>
        <option value={1}>준비중</option>
        <option value={2}>진행중</option>
        <option value={3}>종료</option>
      </select>
      {state.error && <p style={{ color: "#e02020" }}>{state.error}</p>}
      <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
        {initial ? "수정 저장" : "등록"}
      </button>
    </form>
  );
}
