"use client";

import { useActionState, useRef } from "react";
import type { MemberFormConfig } from "@shoppingmall/core";
import { registerAction } from "@/app/regist/actions";
import { PostcodeSearchButton } from "./PostcodeSearchButton";

// Port of regist.html. Only the common optional fields (tel/cell/address,
// mail/SMS consent) are wired to `member_form_*` config — the long tail
// (birth/gender/marry/job/hobby/company/custom fields) isn't, see
// MIGRATION.md. All member_form_* flags default to 0 in this fresh
// install's seed, so by default none of the optional fields render anyway.
export function RegistForm({ config }: { config: MemberFormConfig }) {
  const [state, formAction, pending] = useActionState(registerAction, {});
  const postcodeRef = useRef<HTMLInputElement>(null);
  const address1Ref = useRef<HTMLInputElement>(null);
  const address2Ref = useRef<HTMLInputElement>(null);

  return (
    <div id="contents">
      <h2 className="contentTitle">회원가입</h2>

      <form action={formAction}>
        <div className="inputBox">
          <ul>
            <li>
              <input type="text" name="id" required maxLength={50} placeholder="아이디" autoComplete="username" />
            </li>
            <li>
              <input type="password" name="passwd" required placeholder="비밀번호" autoComplete="new-password" />
            </li>
            <li>
              <input type="text" name="name" required placeholder="이름" />
            </li>
            <li>
              <input type="text" name="email" required placeholder="이메일" autoComplete="email" />
            </li>
            {config.telRequired > 0 && (
              <li>
                <input type="text" name="tel" required={config.telRequired === 2} placeholder="전화번호" />
              </li>
            )}
            {config.cellRequired > 0 && (
              <li>
                <input type="text" name="cell" required={config.cellRequired === 2} placeholder="휴대폰번호" />
              </li>
            )}
            {config.addressRequired > 0 && (
              <>
                <li>
                  <input type="text" name="postcode" placeholder="우편번호" ref={postcodeRef} readOnly />
                  <PostcodeSearchButton postcodeRef={postcodeRef} address1Ref={address1Ref} address2Ref={address2Ref} />
                </li>
                <li>
                  <input type="text" name="address1" required={config.addressRequired === 2} placeholder="주소" ref={address1Ref} readOnly />
                </li>
                <li>
                  <input type="text" name="address2" placeholder="상세주소" ref={address2Ref} />
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="agreeBox center">
          <p>
            <label>
              <input type="checkbox" name="agree1" value="1" required />
              <span className="checkbox" />
              [필수] 만 14세 이상입니다.
            </label>
          </p>
          <p>
            <label>
              <input type="checkbox" name="agree2" value="1" required />
              <span className="checkbox" />
              [필수] 이용약관 동의
            </label>
          </p>
          <p>
            <label>
              <input type="checkbox" name="agree3" value="1" required />
              <span className="checkbox" />
              [필수] 개인정보 수집 및 이용에 대한 동의
            </label>
          </p>
          <div>{config.agreementTerms && <div dangerouslySetInnerHTML={{ __html: config.agreementTerms }} />}</div>
          <div>{config.agreementPrivacy && <div dangerouslySetInnerHTML={{ __html: config.agreementPrivacy }} />}</div>

          {config.smsEnabled && (
            <p>
              <label>
                <input type="checkbox" name="sms" value="Y" />
                <span className="checkbox" />
                [선택] 이벤트 및 쇼핑혜택 SMS 수신 동의
              </label>
            </p>
          )}
          {config.maillingEnabled && (
            <p>
              <label>
                <input type="checkbox" name="mailling" value="Y" />
                <span className="checkbox" />
                [선택] 이벤트 및 쇼핑혜택 이메일 수신 동의
              </label>
            </p>
          )}
        </div>

        {state.error && <p style={{ color: "#e02020", padding: "10px 0" }}>{state.error}</p>}

        <div className="btnShineBox" style={{ background: "#fff" }}>
          <div className="displayInline width100">
            <button className="fontSCDream weight300 shine black" type="submit" disabled={pending}>
              {pending ? "가입 처리 중..." : "회원가입"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
