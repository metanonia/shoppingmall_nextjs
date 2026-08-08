"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { registerVendorAction, type RegisterVendorFormState } from "@/app/regist_vendor/actions";
import { PostcodeSearchButton } from "./PostcodeSearchButton";

export function RegistVendorForm() {
  const [state, formAction, pending] = useActionState<RegisterVendorFormState, FormData>(registerVendorAction, {});
  const postcodeRef = useRef<HTMLInputElement>(null);
  const address1Ref = useRef<HTMLInputElement>(null);
  const address2Ref = useRef<HTMLInputElement>(null);

  if (state.success) {
    return (
      <div>
        <p>입점신청이 접수되었습니다. 관리자 승인 후 로그인하실 수 있습니다.</p>
        <Link href="/">홈으로</Link>
      </div>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
      <div className="inputBox">
        <ul>
          <li>
            <input type="text" name="id" placeholder="아이디" required />
          </li>
          <li>
            <input type="password" name="passwd" placeholder="비밀번호" required />
          </li>
        </ul>
      </div>

      <fieldset>
        <legend>입점 제출서류</legend>
        <label>사업자등록증 <input type="file" name="image1" accept="image/*,.pdf" /></label>
        <label style={{ display: "block", marginTop: 6 }}>통장사본 <input type="file" name="image2" accept="image/*,.pdf" /></label>
      </fieldset>

      <div className="inputBox">
        <ul>
          <li>
            <input type="text" name="compName" placeholder="상호명" required />
          </li>
          <li>
            <input type="text" name="compOwner" placeholder="대표자명" required />
          </li>
          <li>
            <input type="text" name="compLicenseNo" placeholder="사업자등록번호" />
          </li>
          <li>
            <input type="text" name="compType" placeholder="업태" />
          </li>
          <li>
            <input type="text" name="compItem" placeholder="종목" />
          </li>
          <li>
            <input type="text" name="compPostcode" placeholder="우편번호" ref={postcodeRef} readOnly />
            <PostcodeSearchButton postcodeRef={postcodeRef} address1Ref={address1Ref} address2Ref={address2Ref} />
          </li>
          <li>
            <input type="text" name="compAddress1" placeholder="주소" ref={address1Ref} readOnly />
          </li>
          <li>
            <input type="text" name="compAddress2" placeholder="상세주소" ref={address2Ref} />
          </li>
          <li>
            <input type="email" name="compEmail" placeholder="사업자 이메일" required />
          </li>
          <li>
            <input type="text" name="compTel" placeholder="대표 전화번호" />
          </li>
          <li>
            <input type="text" name="compFax" placeholder="팩스번호" />
          </li>
        </ul>
      </div>

      <div className="inputBox">
        <ul>
          <li>
            <input type="text" name="contName" placeholder="담당자명" required />
          </li>
          <li>
            <input type="text" name="contPart" placeholder="담당 부서" />
          </li>
          <li>
            <input type="text" name="contPosition" placeholder="담당자 직급" />
          </li>
          <li>
            <input type="text" name="contCell" placeholder="담당자 휴대폰" required />
          </li>
          <li>
            <input type="email" name="contEmail" placeholder="담당자 이메일" />
          </li>
        </ul>
      </div>

      <div className="inputBox">
        <ul>
          <li>
            <select name="accountCycle" defaultValue={1}>
              <option value={1}>월 1회 정산</option>
              <option value={2}>월 2회 정산</option>
            </select>
          </li>
          <li>
            <input type="text" name="bankName" placeholder="은행명" />
          </li>
          <li>
            <input type="text" name="bankNum" placeholder="계좌번호" />
          </li>
          <li>
            <input type="text" name="bankOwner" placeholder="예금주" />
          </li>
        </ul>
      </div>

      <label>
        <input type="checkbox" name="agree" />
        <span className="checkbox" /> 입점 이용약관에 동의합니다.
      </label>

      {state.error && <p style={{ color: "#e02020" }}>{state.error}</p>}
      <button className="fontSCDream weight300 shine black" type="submit" disabled={pending}>
        {pending ? "신청 중..." : "입점신청"}
      </button>
    </form>
  );
}
