"use client";

import { useActionState } from "react";
import type { MemberProfile } from "@shoppingmall/core";
import { updateProfileAction } from "@/app/member_modify/actions";

// Port of member_modify.html.
export function MemberModifyForm({ profile }: { profile: MemberProfile }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, {});

  return (
    <div id="contents">
      <h2 className="contentTitle">회원정보 수정</h2>

      <form action={formAction}>
        <div className="inputBox">
          <ul>
            <li>아이디: {profile.id}</li>
            <li>
              <input type="text" name="name" defaultValue={profile.name} required placeholder="이름" />
            </li>
            <li>
              <input type="text" name="email" defaultValue={profile.email} required placeholder="이메일" />
            </li>
            <li>
              <input type="text" name="tel" defaultValue={profile.tel} placeholder="전화번호" />
            </li>
            <li>
              <input type="text" name="cell" defaultValue={profile.cell} placeholder="휴대폰번호" />
            </li>
            <li>
              <input type="text" name="postcode" defaultValue={profile.postcode} placeholder="우편번호" />
            </li>
            <li>
              <input type="text" name="address1" defaultValue={profile.address1} placeholder="주소" />
            </li>
            <li>
              <input type="text" name="address2" defaultValue={profile.address2} placeholder="상세주소" />
            </li>
          </ul>
        </div>

        <p>
          <label>
            <input type="checkbox" name="mailling" value="Y" defaultChecked={profile.mailling} />
            <span className="checkbox" />
            이메일 수신 동의
          </label>
        </p>
        <p>
          <label>
            <input type="checkbox" name="sms" value="Y" defaultChecked={profile.sms} />
            <span className="checkbox" />
            SMS 수신 동의
          </label>
        </p>

        {state.error && <p style={{ color: "#e02020" }}>{state.error}</p>}
        {state.success && <p style={{ color: "#2a8f2a" }}>회원정보가 변경 되었습니다.</p>}

        <div className="btnShineBox" style={{ background: "#fff" }}>
          <button className="fontSCDream weight300 shine black" type="submit" disabled={pending}>
            {pending ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
