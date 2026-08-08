"use client";

import { useActionState } from "react";
import { vendorLoginAction, type ActionState } from "@/app/vendor/actions";

export function VendorLoginForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(vendorLoginAction, {});

  return (
    <div style={{ maxWidth: 320, margin: "120px auto" }}>
      <h1 style={{ fontSize: 20, marginBottom: 24, textAlign: "center" }}>SHOP NEXT 입점사센터</h1>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="text" name="id" placeholder="아이디" required />
        <input type="password" name="passwd" placeholder="비밀번호" required />
        {state.error && <div style={{ color: "#e02020", fontSize: 12 }}>{state.error}</div>}
        <button type="submit" disabled={pending}>
          {pending ? "로그인 중..." : "로그인"}
        </button>
      </form>
      <div style={{ marginTop: 16, textAlign: "center", fontSize: 12 }}>
        <a href="http://localhost:3000/regist_vendor">입점신청</a>
      </div>
    </div>
  );
}
