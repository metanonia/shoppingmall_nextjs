"use client";

import { useActionState } from "react";
import type { AdminBannerDetail } from "@shoppingmall/core";
import { createBannerAction, updateBannerAction, type ActionState } from "@/app/(protected)/banners/actions";
import { imageUrl } from "@/lib/image-url";

function toDateInput(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function BannerForm({ device, initial }: { device: "pc" | "mobile"; initial: AdminBannerDetail | null }) {
  const action = initial ? updateBannerAction : createBannerAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const folder = device === "mobile" ? "mobile_banner" : "banner";

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
      <input type="hidden" name="device" value={device} />
      {initial && <input type="hidden" name="uid" value={initial.uid} />}
      {initial && <input type="hidden" name="existingImage1" value={initial.image1} />}
      <input type="text" name="name" placeholder="배너명" defaultValue={initial?.name} required />
      <input type="text" name="code" placeholder="노출위치 코드(예: LOGO, TOPL, MAINT)" defaultValue={initial?.code} required />
      <input type="text" name="link1" placeholder="링크" defaultValue={initial?.link1} />
      <label>
        <input type="checkbox" name="target" defaultChecked={initial?.target === 1} /> 새 창에서 열기
      </label>
      <label>
        이미지
        <input type="file" name="image1" accept="image/*" />
        {initial?.image1 && <img src={imageUrl(folder, initial.image1, initial.uid)} alt="" style={{ height: 40, marginLeft: 8 }} />}
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="date" name="sDate" defaultValue={toDateInput(initial?.sDate)} />
        <input type="date" name="eDate" defaultValue={toDateInput(initial?.eDate)} />
      </div>
      <input type="number" name="sequence" placeholder="노출순서" defaultValue={initial?.sequence} />
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
