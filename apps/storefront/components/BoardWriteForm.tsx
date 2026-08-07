"use client";

import { useActionState } from "react";
import type { BoardConfigEntry, BoardId } from "@shoppingmall/core";
import { createPostAction, type CreatePostFormState } from "@/app/board/[boardId]/actions";

export function BoardWriteForm({ boardId, config, isMember }: { boardId: BoardId; config: BoardConfigEntry; isMember: boolean }) {
  const [state, formAction, pending] = useActionState<CreatePostFormState, FormData>(createPostAction, {});

  return (
    <form action={formAction} encType={config.hasFiles ? "multipart/form-data" : undefined}>
      <input type="hidden" name="boardId" value={boardId} />

      {!isMember && (
        <div className="inputBox">
          <ul>
            <li>
              <input type="text" name="guestName" placeholder="이름" required />
            </li>
            <li>
              <input type="password" name="guestPasswd" placeholder="비밀번호 (조회/수정 시 필요)" required />
            </li>
          </ul>
        </div>
      )}

      <div className="inputBox">
        <ul>
          {config.categories && (
            <li>
              <select name="category">
                {config.categories.map((name, i) => (
                  <option key={name} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </li>
          )}
          {config.hasContact && (
            <li>
              <input type="text" name="contact" placeholder="연락처" required />
            </li>
          )}
          <li>
            <input type="text" name="subject" placeholder="제목" required />
          </li>
          <li>
            <textarea name="content" placeholder="내용을 입력해 주세요." rows={8} required />
          </li>
          {config.hasFiles && (
            <li>
              <input type="file" name="files" multiple accept=".jpg,.jpeg,.png,.gif,.webp,.pdf" />
              <div className="colorGray size12">이미지/PDF, 파일당 5MB, 최대 5개</div>
            </li>
          )}
        </ul>
      </div>

      {config.secretType === "optional" && (
        <p>
          <label>
            <input type="checkbox" name="secret" />
            <span className="checkbox" /> 비밀글로 작성
          </label>
        </p>
      )}
      {config.secretType === "always" && <div className="colorGray size12">이 게시판은 항상 비밀글로 등록됩니다.</div>}

      {state.error && <p style={{ color: "#e02020" }}>{state.error}</p>}

      <button className="fontSCDream weight300 shine black" type="submit" disabled={pending}>
        {pending ? "등록 중..." : "등록"}
      </button>
    </form>
  );
}
