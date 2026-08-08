"use client";

import { useActionState } from "react";
import { findMemberIdAction, type FindIdState } from "@/app/id_search/actions";

export function IdSearchForm() {
  const [state, formAction, pending] = useActionState<FindIdState, FormData>(findMemberIdAction, {});

  return (
    <div className="loginBox">
      <div className="empty30" />
      <form action={formAction}>
        <div className="inputBox">
          <ul>
            <li>
              <input type="text" name="name" required placeholder="이름" />
            </li>
            <li>
              <input type="email" name="email" required placeholder="가입 시 등록한 이메일" />
            </li>
          </ul>
        </div>

        {state.error && <p style={{ color: "#e02020", padding: "10px 0" }}>{state.error}</p>}
        {state.maskedId && (
          <p style={{ padding: "10px 0" }}>
            회원님의 아이디는 <b>{state.maskedId}</b> 입니다.
          </p>
        )}

        <div className="empty20" />
        <div className="btnShineBox" style={{ background: "#fff" }}>
          <div className="displayInline width100">
            <button className="fontSCDream weight300 shine black" type="submit" disabled={pending}>
              {pending ? "조회 중..." : "아이디 찾기"}
            </button>
          </div>
        </div>
      </form>
      <div className="empty10" />
      <a href="/passwd_search" className="underLine">
        비밀번호 찾기
      </a>
    </div>
  );
}
