"use client";

import { useRef } from "react";
import type { MemberFormConfig, MemberProfile } from "@shoppingmall/core";
import { PostcodeSearchButton } from "./PostcodeSearchButton";

export function MemberExtraFields({ config, profile }: { config: MemberFormConfig; profile?: MemberProfile }) {
  const compPostcodeRef = useRef<HTMLInputElement>(null);
  const compAddress1Ref = useRef<HTMLInputElement>(null);
  const compAddress2Ref = useRef<HTMLInputElement>(null);
  const required = (level: number) => level === 2;
  return (
    <>
      {config.birthRequired > 0 && <li><input name="birth" maxLength={8} required={required(config.birthRequired)} defaultValue={profile?.birth} placeholder="생년월일 (YYYYMMDD)" /><label><input type="radio" name="birthSl" value="S" required={required(config.birthRequired)} defaultChecked={profile?.birthSl === "S"} /> 양력</label><label><input type="radio" name="birthSl" value="L" defaultChecked={profile?.birthSl === "L"} /> 음력</label></li>}
      {config.genderRequired > 0 && <li><label><input type="radio" name="gender" value="M" required={required(config.genderRequired)} defaultChecked={profile?.gender === "M"} /> 남성</label><label><input type="radio" name="gender" value="F" defaultChecked={profile?.gender === "F"} /> 여성</label></li>}
      {config.marryRequired > 0 && <li><label><input type="radio" name="marry" value="M" required={required(config.marryRequired)} defaultChecked={profile?.marry === "M"} /> 기혼</label><label><input type="radio" name="marry" value="S" defaultChecked={profile?.marry === "S"} /> 미혼</label></li>}
      {config.jobRequired > 0 && <li><span>직업 </span>{config.jobOptions.map((option) => <label key={option}><input type="radio" name="job" value={option} required={required(config.jobRequired)} defaultChecked={profile?.job === option} /> {option}</label>)}</li>}
      {config.hobbyRequired > 0 && <li><span>관심분야 </span>{config.hobbyOptions.map((option) => <label key={option}><input type="checkbox" name="hobby" value={option} defaultChecked={profile?.hobby.split("|").includes(option)} /> {option}</label>)}</li>}
      {config.customFields.filter((field) => field.required > 0).map((field) => {
        const index = Number(field.key.slice(3)) - 1;
        return <li key={field.key}><input name={field.key} required={required(field.required)} defaultValue={profile?.add[index]} placeholder={field.title || `추가항목 ${index + 1}`} /></li>;
      })}
      {config.compRequired > 0 && <li><input name="comp" required={required(config.compRequired)} defaultValue={profile?.comp} placeholder="회사명" /></li>}
      {config.compNumRequired > 0 && <li><input name="compNum" required={required(config.compNumRequired)} defaultValue={profile?.compNum} placeholder="사업자등록번호" /></li>}
      {config.compOwnerRequired > 0 && <li><input name="compOwner" required={required(config.compOwnerRequired)} defaultValue={profile?.compOwner} placeholder="대표자명" /></li>}
      {config.compAddressRequired > 0 && <><li><input name="compPostcode" ref={compPostcodeRef} readOnly defaultValue={profile?.compPostcode} placeholder="사업장 우편번호" /><PostcodeSearchButton postcodeRef={compPostcodeRef} address1Ref={compAddress1Ref} address2Ref={compAddress2Ref} /></li><li><input name="compAddress1" ref={compAddress1Ref} readOnly required={required(config.compAddressRequired)} defaultValue={profile?.compAddress1} placeholder="사업장 주소" /></li><li><input name="compAddress2" ref={compAddress2Ref} defaultValue={profile?.compAddress2} placeholder="사업장 상세주소" /></li></>}
      {config.compTypeRequired > 0 && <li><input name="compType" required={required(config.compTypeRequired)} defaultValue={profile?.compType} placeholder="업태" /></li>}
      {config.compItemRequired > 0 && <li><input name="compItem" required={required(config.compItemRequired)} defaultValue={profile?.compItem} placeholder="종목" /></li>}
    </>
  );
}
