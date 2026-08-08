"use client";

import { useActionState } from "react";
import type { AdminPopupDetail } from "@shoppingmall/core";
import { createPopupAction, updatePopupAction, type ActionState } from "@/app/(protected)/popups/actions";
import { imageUrl } from "@/lib/image-url";

function toDateInput(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function PopupForm({ device, initial }: { device: "pc" | "mobile"; initial: AdminPopupDetail | null }) {
  const action = initial ? updatePopupAction : createPopupAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const folder = device === "mobile" ? "mobile_popup" : "popup";
  const [posTop, posLeft] = (initial?.inputPosition ?? "").split("|");
  const [width, height] = (initial?.inputSize ?? "").split("|");

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
      <input type="hidden" name="device" value={device} />
      {initial && <input type="hidden" name="uid" value={initial.uid} />}
      {initial && <input type="hidden" name="existingImage1" value={initial.image1} />}
      <input type="text" name="name" placeholder="팝업명" defaultValue={initial?.name} required />
      <label>
        <input type="checkbox" name="period" defaultChecked={initial?.period === 1} /> 노출기간 지정
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="date" name="sDate" defaultValue={toDateInput(initial?.sDate)} />
        <input type="date" name="eDate" defaultValue={toDateInput(initial?.eDate)} />
      </div>
      <select name="type" defaultValue={initial?.type ?? 0}>
        <option value={0}>매번 노출</option>
        <option value={1}>하루동안 안보기 지원</option>
      </select>
      <select name="position" defaultValue={initial?.position ?? 1}>
        <option value={0}>직접입력(top/left)</option>
        <option value={1}>중앙</option>
      </select>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="text" name="posTop" placeholder="top(px)" defaultValue={posTop} />
        <input type="text" name="posLeft" placeholder="left(px)" defaultValue={posLeft} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="text" name="width" placeholder="너비(px)" defaultValue={width} />
        <input type="text" name="height" placeholder="높이(px)" defaultValue={height} />
      </div>
      <label>
        <input type="checkbox" name="imageOnly" defaultChecked={initial?.imageOnly} /> 이미지로만 구성
      </label>
      <label>
        이미지
        <input type="file" name="image1" accept="image/*" />
        {initial?.image1 && <img src={imageUrl(folder, initial.image1, initial.uid)} alt="" style={{ height: 40, marginLeft: 8 }} />}
      </label>
      <input type="text" name="link1" placeholder="클릭 시 이동 링크" defaultValue={initial?.link1} />
      <textarea name="content" placeholder="내용(HTML, 이미지전용이 아닐 때)" defaultValue={initial?.content} rows={4} />
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
