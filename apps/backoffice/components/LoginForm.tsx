"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/login/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<{ error?: string }, FormData>(loginAction, {});

  return (
    <div style={{ maxWidth: 320, margin: "120px auto" }}>
      <h1 style={{ fontSize: 20, marginBottom: 24, textAlign: "center" }}>SHOP NEXT 관리자</h1>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="text" name="id" placeholder="아이디" required />
        <input type="password" name="passwd" placeholder="비밀번호" required />
        {state.error && <div style={{ color: "#e02020", fontSize: 12 }}>{state.error}</div>}
        <button type="submit" disabled={pending}>
          {pending ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}
