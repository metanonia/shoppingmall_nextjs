"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/member_passwd/actions";

// Port of member_passwd.html.
export function MemberPasswdForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, {});

  return (
    <div id="contents">
      <h2 className="contentTitle">비밀번호 변경</h2>

      <form action={formAction}>
        <div className="inputBox">
          <ul>
            <li>
              <input type="password" name="orig_passwd" required placeholder="현재 비밀번호" autoComplete="current-password" />
            </li>
            <li>
              <input type="password" name="passwd" required placeholder="새 비밀번호" autoComplete="new-password" />
            </li>
            <li>
              <input type="password" name="passwd2" required placeholder="새 비밀번호 확인" autoComplete="new-password" />
            </li>
          </ul>
        </div>

        {state.error && <p style={{ color: "#e02020" }}>{state.error}</p>}
        {state.success && <p style={{ color: "#2a8f2a" }}>비밀번호가 변경 되었습니다.</p>}

        <div className="btnShineBox" style={{ background: "#fff" }}>
          <button className="fontSCDream weight300 shine black" type="submit" disabled={pending}>
            {pending ? "변경 중..." : "비밀번호 변경"}
          </button>
        </div>
      </form>
    </div>
  );
}
