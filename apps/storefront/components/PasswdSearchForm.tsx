"use client";

import { useState, useTransition } from "react";
import type { PasswordResetChannel } from "@shoppingmall/core";
import {
  lookupPasswordResetTargetsAction,
  requestPasswordResetCodeAction,
  resetPasswordWithCodeAction,
} from "@/app/passwd_search/actions";

type Step = 1 | 2 | 3 | 4;

export function PasswdSearchForm() {
  const [step, setStep] = useState<Step>(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [maskedCell, setMaskedCell] = useState<string | null>(null);
  const [channel, setChannel] = useState<PasswordResetChannel>("email");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  function handleLookup() {
    setError(null);
    startTransition(async () => {
      const result = await lookupPasswordResetTargetsAction(id, name);
      if (!result.ok) return setError(result.error);
      setMaskedEmail(result.maskedEmail);
      setMaskedCell(result.maskedCell);
      setChannel(result.maskedEmail ? "email" : "sms");
      setStep(2);
    });
  }

  function handleRequestCode() {
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordResetCodeAction(id, name, channel);
      if (!result.ok) return setError(result.error);
      setStep(3);
    });
  }

  function handleReset() {
    setError(null);
    if (newPassword.length < 4) return setError("비밀번호는 4자 이상이어야 합니다.");
    if (newPassword !== newPasswordConfirm) return setError("비밀번호가 일치하지 않습니다.");
    startTransition(async () => {
      const result = await resetPasswordWithCodeAction(id, code, newPassword);
      if (!result.ok) return setError(result.error);
      setStep(4);
    });
  }

  return (
    <div className="loginBox">
      <div className="empty30" />

      {step === 1 && (
        <div className="inputBox">
          <ul>
            <li>
              <input type="text" value={id} onChange={(e) => setId(e.target.value)} required placeholder="아이디" />
            </li>
            <li>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="이름" />
            </li>
          </ul>
          {error && <p style={{ color: "#e02020", padding: "10px 0" }}>{error}</p>}
          <div className="empty20" />
          <button className="fontSCDream weight300 shine black" type="button" disabled={pending || !id || !name} onClick={handleLookup}>
            {pending ? "확인 중..." : "다음"}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="inputBox">
          <p>인증코드를 받을 방법을 선택해 주세요.</p>
          <ul>
            {maskedEmail && (
              <li>
                <label>
                  <input type="radio" checked={channel === "email"} onChange={() => setChannel("email")} /> 이메일({maskedEmail})
                </label>
              </li>
            )}
            {maskedCell && (
              <li>
                <label>
                  <input type="radio" checked={channel === "sms"} onChange={() => setChannel("sms")} /> 휴대폰({maskedCell})
                </label>
              </li>
            )}
          </ul>
          {error && <p style={{ color: "#e02020", padding: "10px 0" }}>{error}</p>}
          <div className="empty20" />
          <button className="fontSCDream weight300 shine black" type="button" disabled={pending} onClick={handleRequestCode}>
            {pending ? "발송 중..." : "인증코드 받기"}
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="inputBox">
          <ul>
            <li>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} required placeholder="인증코드 6자리" maxLength={6} />
            </li>
            <li>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="새 비밀번호"
              />
            </li>
            <li>
              <input
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                required
                placeholder="새 비밀번호 확인"
              />
            </li>
          </ul>
          {error && <p style={{ color: "#e02020", padding: "10px 0" }}>{error}</p>}
          <div className="empty20" />
          <button className="fontSCDream weight300 shine black" type="button" disabled={pending || code.length !== 6} onClick={handleReset}>
            {pending ? "변경 중..." : "비밀번호 변경"}
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="inputBox">
          <p>비밀번호가 변경되었습니다.</p>
          <div className="empty20" />
          <a className="fontSCDream weight300 shine black" href="/login" style={{ display: "inline-block" }}>
            로그인하러 가기
          </a>
        </div>
      )}

      <div className="empty10" />
      <a href="/id_search" className="underLine">
        아이디 찾기
      </a>
    </div>
  );
}
