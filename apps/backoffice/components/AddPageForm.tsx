"use client";

import { useActionState } from "react";
import type { AdminAddPageDetail } from "@shoppingmall/core";
import { createAddPageAction, updateAddPageAction, type ActionState } from "@/app/(protected)/pages/actions";
import { imageUrl } from "@/lib/image-url";

export function AddPageForm({ initial }: { initial: AdminAddPageDetail | null }) {
  const action = initial ? updateAddPageAction : createAddPageAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 600 }}>
      {initial && <input type="hidden" name="uid" value={initial.uid} />}
      {initial?.detailImages.map((f) => (
        <input key={f} type="hidden" name="existingDetailImages" value={f} />
      ))}
      <input type="text" name="title" placeholder="페이지 제목" defaultValue={initial?.title} required />
      <label>
        <input type="checkbox" name="detailImageOnly" defaultChecked={initial?.detailImageOnly} /> 이미지로만 구성
      </label>
      <label>
        <input type="radio" name="detailImageType" value={1} defaultChecked={(initial?.detailImageType ?? 1) === 1} /> 이미지 간 여백 있음
      </label>
      <label>
        <input type="radio" name="detailImageType" value={2} defaultChecked={initial?.detailImageType === 2} /> 이미지 간 여백 없음
      </label>
      <label>
        이미지 추가 (복수 선택 가능, 위→아래 순서로 출력)
        <input type="file" name="detailImages" accept="image/*" multiple />
      </label>
      {initial?.detailImages.map((f) => (
        <img key={f} src={imageUrl("add_page", f, initial.uid)} alt="" style={{ height: 60, marginRight: 4 }} />
      ))}
      <textarea name="explains" placeholder="페이지 내용(HTML, 이미지전용이 아닐 때)" defaultValue={initial?.explains} rows={8} />
      <select name="status" defaultValue={initial?.status ?? 0}>
        <option value={0}>사용</option>
        <option value={1}>미사용</option>
      </select>
      {state.error && <p style={{ color: "#e02020" }}>{state.error}</p>}
      <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
        {initial ? "수정 저장" : "등록"}
      </button>
    </form>
  );
}
