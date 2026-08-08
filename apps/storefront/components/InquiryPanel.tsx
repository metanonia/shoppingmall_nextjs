"use client";

import { useActionState, useState } from "react";
import type { InquiryItem } from "@shoppingmall/core";
import {
  createInquiryAction,
  type InquiryFormState,
  type UnlockInquiryFormState,
  unlockInquiryAction,
} from "@/app/goods/[uid]/actions";

type InquiryConfig = {
  allowGuest: boolean;
  secretType: number;
  privacy: boolean;
  categoryInfo: string;
  guestAgreement: string;
};

function parseCategories(raw: string): { value: number; label: string }[] {
  const chunks = raw.split("|*|");
  if (Number(chunks[0]) <= 100) return [];
  return chunks.slice(1).flatMap((chunk) => {
    const [value, label] = chunk.split("|");
    const parsed = Number(value);
    return Number.isInteger(parsed) && label ? [{ value: parsed, label }] : [];
  });
}

function protectedName(name: string, privacy: boolean): string {
  if (!privacy || name.length < 2) return name;
  return `${name[0]}*${name.slice(2)}`;
}

function GuestInquiryUnlock({ inquiry }: { inquiry: InquiryItem }) {
  const [state, action, pending] = useActionState<UnlockInquiryFormState, FormData>(unlockInquiryAction, {});
  if (state.content !== undefined) {
    return (
      <div className="empty10">
        <div>{state.content}</div>
        {state.files?.map((filename) => <a key={filename} href={`/uploads/inquiry/${inquiry.uid}/${filename}`} target="_blank" rel="noreferrer">첨부파일</a>)}
        {state.answer && <div style={{ background: "#f7f7f7", padding: 10, marginTop: 6 }}>{state.answer}</div>}
      </div>
    );
  }
  return (
    <form action={action} style={{ marginTop: 8 }}>
      <input type="hidden" name="uid" value={inquiry.uid} />
      <input type="password" name="password" required placeholder="작성 비밀번호" autoComplete="current-password" />
      <button type="submit" disabled={pending}>{pending ? "확인 중..." : "확인"}</button>
      {state.error && <span style={{ color: "#e02020", marginLeft: 8 }}>{state.error}</span>}
    </form>
  );
}

export function InquiryPanel({
  goodsUid,
  isMember,
  inquiries,
  config,
}: {
  goodsUid: number;
  isMember: boolean;
  inquiries: InquiryItem[];
  config: InquiryConfig;
}) {
  const [openUid, setOpenUid] = useState<number | null>(null);
  const [state, formAction, pending] = useActionState<InquiryFormState, FormData>(createInquiryAction, {});
  const categories = parseCategories(config.categoryInfo);
  const canWrite = isMember || config.allowGuest;

  return (
    <div>
      {canWrite ? (
        <form action={formAction} encType="multipart/form-data" style={{ marginBottom: 20 }}>
          <input type="hidden" name="goodsUid" value={goodsUid} />
          <div className="inputBox">
            <ul>
              {!isMember && (
                <li style={{ display: "flex", gap: 8 }}>
                  <input type="text" name="name" required placeholder="이름" />
                  <input type="password" name="password" required placeholder="비밀번호" autoComplete="new-password" />
                </li>
              )}
              {categories.length > 0 && (
                <li>
                  <select name="category" required defaultValue="">
                    <option value="" disabled>분류 선택</option>
                    {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                  </select>
                </li>
              )}
              <li>
                <input type="text" name="subject" required placeholder="제목" />
              </li>
              <li>
                <textarea name="content" required placeholder="문의 내용을 입력해 주세요." rows={4} />
              </li>
              <li><input type="file" name="files" multiple accept=".jpg,.jpeg,.png,.gif,.webp,.pdf" /><div className="colorGray size12">파일당 5MB, 최대 5개</div></li>
            </ul>
          </div>
          {config.secretType === 2 && (
            <p>
              <label>
                <input type="checkbox" name="secret" />
                <span className="checkbox" /> 비밀글로 작성
              </label>
            </p>
          )}
          {config.secretType === 1 && <p className="colorGray size12">모든 문의는 비밀글로 등록됩니다.</p>}
          {!isMember && (
            <div style={{ border: "1px solid #ddd", padding: 10, marginBottom: 10 }}>
              {config.guestAgreement && <div dangerouslySetInnerHTML={{ __html: config.guestAgreement }} />}
              <label>
                <input type="checkbox" name="agreement" required />
                <span className="checkbox" /> 개인정보 수집 및 이용에 동의합니다.
              </label>
            </div>
          )}
          {state.error && <p style={{ color: "#e02020" }}>{state.error}</p>}
          {state.success && <p style={{ color: "#2a8f2a" }}>문의가 등록되었습니다.</p>}
          <button className="fontSCDream weight300 shine black" type="submit" disabled={pending}>
            {pending ? "등록 중..." : "상품문의 작성"}
          </button>
        </form>
      ) : (
        <div className="emptyList">
          상품문의는 <a href={`/login?redirect_to=/goods/${goodsUid}`}>로그인</a> 후 작성할 수 있습니다.
        </div>
      )}

      {inquiries.length === 0 ? (
        <div className="emptyList">아직 등록된 문의가 없습니다.</div>
      ) : (
        <ul className="inquiryList">
          {inquiries.map((inquiry) => (
            <li key={inquiry.uid} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
              <div
                className="cursorPoint"
                onClick={() => setOpenUid(openUid === inquiry.uid ? null : inquiry.uid)}
              >
                {inquiry.secret && <i className="xi-lock size12" />} {inquiry.subject}
                <span className="colorGray size12">
                  {" "}· {protectedName(inquiry.authorName, config.privacy)} · {inquiry.answered ? "답변완료" : "답변대기중"}
                </span>
              </div>
              {openUid === inquiry.uid &&
                (inquiry.viewable ? (
                  <div className="empty10">
                    <div>{inquiry.content}</div>
                    {inquiry.files.map((filename) => <a key={filename} href={`/uploads/inquiry/${inquiry.uid}/${filename}`} target="_blank" rel="noreferrer">첨부파일</a>)}
                    {inquiry.answered && (
                      <div style={{ background: "#f7f7f7", padding: 10, marginTop: 6 }}>{inquiry.answer}</div>
                    )}
                  </div>
                ) : inquiry.guestProtected ? (
                  <GuestInquiryUnlock inquiry={inquiry} />
                ) : (
                  <div className="colorGray size12">비밀글입니다. 작성자만 볼 수 있습니다.</div>
                ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
