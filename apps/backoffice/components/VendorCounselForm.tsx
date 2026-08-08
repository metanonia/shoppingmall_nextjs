"use client";

import { useActionState } from "react";
import { createVendorCounselAction, type VendorBoardState } from "@/app/vendor/(protected)/board/actions";

export function VendorCounselForm() {
  const [state, action, pending] = useActionState<VendorBoardState, FormData>(createVendorCounselAction, {});
  return <form action={action} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 600 }}>
    <input name="subject" required placeholder="제목" />
    <textarea name="content" required rows={8} placeholder="문의 내용" />
    {state.error && <div style={{ color: "#e02020" }}>{state.error}</div>}
    <button type="submit" disabled={pending}>{pending ? "등록 중..." : "문의 등록"}</button>
  </form>;
}
