"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/login/actions";
import type { SocialProvider } from "@shoppingmall/auth";

const SOCIAL_LABEL: Record<SocialProvider, string> = {
  kakao: "카카오 로그인",
  naver: "네이버 로그인",
  google: "구글 로그인",
  payco: "페이코 로그인",
};

// Port of login.html. Legacy submits to a hidden iframe (`target='HFrm'`)
// and social login opens a popup window; this uses a plain server action
// (useActionState for the error message) and a full-page OAuth redirect —
// simpler, and doesn't depend on popup-blocker-sensitive window.open().
export function LoginForm({ redirectTo, socialProviders }: { redirectTo: string; socialProviders: SocialProvider[] }) {
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <div id="contents">
      <h2 className="contentTitle">로그인</h2>

      <form action={formAction}>
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <div className="loginBox">
          <div className="empty30" />

          <div className="inputBox">
            <ul>
              <li>
                <input type="text" name="id" maxLength={50} required placeholder="아이디" autoComplete="username" />
              </li>
              <li>
                <input type="password" name="passwd" required placeholder="비밀번호" autoComplete="current-password" />
              </li>
            </ul>
          </div>

          {state.error && <p style={{ color: "#e02020", padding: "10px 0" }}>{state.error}</p>}

          <div>
            <div className="floatRight">
              <ul>
                <li className="line">
                  <a href="/id_search" className="underLine">
                    아이디 찾기
                  </a>
                </li>
                <li className="line">
                  <a href="/passwd_search" className="underLine">
                    비밀번호 찾기
                  </a>
                </li>
                <li className="line">
                  <a href="/regist" className="underLine">
                    회원가입
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="empty20" />

          <div className="btnShineBox" style={{ background: "#fff" }}>
            <div className="displayInline width100">
              <button className="fontSCDream weight300 shine black" type="submit" disabled={pending}>
                {pending ? "로그인 중..." : "로그인"}
              </button>
            </div>
          </div>

          {socialProviders.length > 0 && (
            <div className="snsBox" style={{ background: "#fff", paddingBottom: 0 }}>
              <center>
                {socialProviders.map((site) => (
                  <a key={site} href={`/auth/${site}`} className="btn btnSocial" style={{ width: "47%", display: "inline-block" }}>
                    {SOCIAL_LABEL[site]}
                  </a>
                ))}
              </center>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
