"use client";

import { useActionState, useRef } from "react";
import type { VendorInfoView } from "@shoppingmall/core";
import { changeVendorPasswordAction, updateVendorInfoAction, type ActionState } from "@/app/vendor/(protected)/profile/actions";
import { PostcodeSearchButton } from "./PostcodeSearchButton";

export function VendorInfoForm({ info, vendorId }: { info: VendorInfoView; vendorId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateVendorInfoAction, {});
  const postcodeRef = useRef<HTMLInputElement>(null);
  const address1Ref = useRef<HTMLInputElement>(null);
  const address2Ref = useRef<HTMLInputElement>(null);

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 480 }}>
      <input type="hidden" name="existingImage1" value={info.image1} />
      <input type="hidden" name="existingImage2" value={info.image2} />

      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>회사정보</legend>
        <input type="text" name="compName" placeholder="상호명" defaultValue={info.compName} required />
        <input type="text" name="compOwner" placeholder="대표자명" defaultValue={info.compOwner} required style={{ marginTop: 6 }} />
        <input type="text" name="compLicenseNo" placeholder="사업자등록번호" defaultValue={info.compLicenseNo} required style={{ marginTop: 6 }} />
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input type="text" name="compType" placeholder="업태" defaultValue={info.compType} />
          <input type="text" name="compItem" placeholder="종목" defaultValue={info.compItem} />
        </div>
        <div style={{ marginTop: 6 }}>
          <input type="text" name="compPostcode" placeholder="우편번호" defaultValue={info.compPostcode} ref={postcodeRef} readOnly />
          <PostcodeSearchButton postcodeRef={postcodeRef} address1Ref={address1Ref} address2Ref={address2Ref} />
        </div>
        <input type="text" name="compAddress1" placeholder="주소" defaultValue={info.compAddress1} ref={address1Ref} readOnly style={{ marginTop: 6, width: "100%" }} />
        <input type="text" name="compAddress2" placeholder="상세주소" defaultValue={info.compAddress2} ref={address2Ref} style={{ marginTop: 6, width: "100%" }} />
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input type="text" name="compEmail" placeholder="이메일" defaultValue={info.compEmail} required />
          <input type="text" name="compTel" placeholder="전화번호" defaultValue={info.compTel} required />
          <input type="text" name="compFax" placeholder="팩스" defaultValue={info.compFax} />
        </div>
      </fieldset>

      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>담당자정보</legend>
        <input type="text" name="contName" placeholder="담당자명" defaultValue={info.contName} />
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input type="text" name="contCell" placeholder="휴대폰번호" defaultValue={info.contCell} />
          <input type="text" name="contEmail" placeholder="이메일" defaultValue={info.contEmail} />
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input type="text" name="contPart" placeholder="부서" defaultValue={info.contPart} />
          <input type="text" name="contPosition" placeholder="직위" defaultValue={info.contPosition} />
        </div>
      </fieldset>

      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>정산 입금계좌</legend>
        <input type="text" name="bankName" placeholder="은행명" defaultValue={info.bankName} required />
        <input type="text" name="bankNum" placeholder="계좌번호" defaultValue={info.bankNum} required style={{ marginTop: 6 }} />
        <input type="text" name="bankOwner" placeholder="예금주" defaultValue={info.bankOwner} required style={{ marginTop: 6 }} />
      </fieldset>

      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>증빙서류</legend>
        <div>
          사업자등록증 사본{" "}
          {info.image1 && (
            <a href={`/vendor-docs/${vendorId}/${info.image1}`} target="_blank" rel="noreferrer">
              (현재 파일 보기)
            </a>
          )}
        </div>
        <input type="file" name="image1" accept="image/*,.pdf" style={{ marginTop: 4 }} />
        <div style={{ marginTop: 10 }}>
          통장 사본{" "}
          {info.image2 && (
            <a href={`/vendor-docs/${vendorId}/${info.image2}`} target="_blank" rel="noreferrer">
              (현재 파일 보기)
            </a>
          )}
        </div>
        <input type="file" name="image2" accept="image/*,.pdf" style={{ marginTop: 4 }} />
      </fieldset>

      {state.error && <div style={{ color: "#e02020" }}>{state.error}</div>}
      {state.success && <div style={{ color: "#2a8" }}>저장되었습니다.</div>}
      <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
        {pending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}

export function VendorPasswordForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(changeVendorPasswordAction, {});

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
      <input type="password" name="currentPassword" placeholder="현재 비밀번호" required />
      <input type="password" name="newPassword" placeholder="새 비밀번호" required />
      <input type="password" name="newPasswordConfirm" placeholder="새 비밀번호 확인" required />
      {state.error && <div style={{ color: "#e02020", fontSize: 12 }}>{state.error}</div>}
      {state.success && <div style={{ color: "#2a8", fontSize: 12 }}>비밀번호가 변경되었습니다.</div>}
      <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
        {pending ? "변경 중..." : "비밀번호 변경"}
      </button>
    </form>
  );
}
