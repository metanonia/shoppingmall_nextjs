"use client";

import { useActionState } from "react";
import { withdrawAction } from "@/app/member_withdrawal/actions";

// Port of member_withdrawal.html.
export function MemberWithdrawalForm() {
  const [state, formAction, pending] = useActionState(withdrawAction, {});

  return (
    <div id="contents">
      <h2 className="contentTitle">회원탈퇴</h2>

      <form action={formAction}>
        <p>탈퇴 시 계정 정보가 삭제되며 복구할 수 없습니다.</p>
        <div className="inputBox">
          <ul>
            <li>
              <input type="password" name="passwd" required placeholder="비밀번호 확인" autoComplete="current-password" />
            </li>
            <li>
              <p className="inputTitle">탈퇴사유</p>
              <div className="clearfix">
                {["상품품질 불만", "배송지연", "교환/환불/반품 불만", "개인정보유출방지", "기타"].map(
                  (reason) => (
                    <label className="min" key={reason} style={{ marginRight: 16 }}>
                      <input type="radio" name="reason" value={reason} required /> {reason}
                    </label>
                  ),
                )}
              </div>
            </li>
            <li>
              <textarea name="message" placeholder="하고 싶은 말을 남겨 주세요" />
            </li>
          </ul>
        </div>

        {state.error && <p style={{ color: "#e02020" }}>{state.error}</p>}

        <div className="btnShineBox" style={{ background: "#fff" }}>
          <button className="fontSCDream weight300 shine black" type="submit" disabled={pending}>
            {pending ? "처리 중..." : "회원탈퇴"}
          </button>
        </div>
      </form>
    </div>
  );
}
