"use client";

import { useActionState, useState } from "react";
import type { InquiryItem } from "@shoppingmall/core";
import { createInquiryAction, type InquiryFormState } from "@/app/goods/[uid]/actions";

// Port of php/view_inquiry.php's inline expandable list + php/popup_inquiry_write.php's
// write form, member-only (see actions.ts). Secret-post password-gating for
// guests isn't reproduced since guest posting itself isn't implemented.
export function InquiryPanel({
  goodsUid,
  isMember,
  inquiries,
}: {
  goodsUid: number;
  isMember: boolean;
  inquiries: InquiryItem[];
}) {
  const [openUid, setOpenUid] = useState<number | null>(null);
  const [state, formAction, pending] = useActionState<InquiryFormState, FormData>(createInquiryAction, {});

  return (
    <div>
      {isMember ? (
        <form action={formAction} style={{ marginBottom: 20 }}>
          <input type="hidden" name="goodsUid" value={goodsUid} />
          <div className="inputBox">
            <ul>
              <li>
                <input type="text" name="subject" required placeholder="제목" />
              </li>
              <li>
                <textarea name="content" required placeholder="문의 내용을 입력해 주세요." rows={4} />
              </li>
            </ul>
          </div>
          <p>
            <label>
              <input type="checkbox" name="secret" />
              <span className="checkbox" /> 비밀글로 작성
            </label>
          </p>
          {state.error && <p style={{ color: "#e02020" }}>{state.error}</p>}
          {state.success && <p style={{ color: "#2a8f2a" }}>문의가 등록되었습니다.</p>}
          <button className="fontSCDream weight300 shine black" type="submit" disabled={pending}>
            {pending ? "등록 중..." : "상품문의 작성"}
          </button>
        </form>
      ) : (
        <div className="emptyList">
          <a href={`/login?redirect_to=/goods/${goodsUid}`}>로그인</a> 후 상품문의를 작성할 수 있습니다.
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
                onClick={() => inquiry.viewable && setOpenUid(openUid === inquiry.uid ? null : inquiry.uid)}
              >
                {inquiry.secret && <i className="xi-lock size12" />} {inquiry.subject}
                <span className="colorGray size12">
                  {" "}
                  · {inquiry.authorName} · {inquiry.answered ? "답변완료" : "답변대기중"}
                </span>
              </div>
              {openUid === inquiry.uid &&
                (inquiry.viewable ? (
                  <div className="empty10">
                    <div>{inquiry.content}</div>
                    {inquiry.answered && (
                      <div style={{ background: "#f7f7f7", padding: 10, marginTop: 6 }}>{inquiry.answer}</div>
                    )}
                  </div>
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
