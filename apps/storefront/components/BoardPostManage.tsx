"use client";

import { useActionState, useState } from "react";
import type { BoardConfigEntry, BoardId, PostDetail } from "@shoppingmall/core";
import {
  deleteOwnPostAction,
  type ManagePostFormState,
  updateOwnPostAction,
} from "@/app/board/[boardId]/actions";

export function BoardPostManage({
  boardId,
  detail,
  isMemberOwner,
  config,
}: {
  boardId: BoardId;
  detail: PostDetail;
  isMemberOwner: boolean;
  config: BoardConfigEntry;
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updating] = useActionState<ManagePostFormState, FormData>(updateOwnPostAction, {});
  const [deleteState, deleteAction, deleting] = useActionState<ManagePostFormState, FormData>(deleteOwnPostAction, {});
  const canManage = config.writable && (isMemberOwner || !detail.authorId);
  if (!canManage) return null;

  return (
    <div className="empty20">
      <button type="button" onClick={() => setEditing((value) => !value)}>{editing ? "수정 취소" : "수정"}</button>
      {editing && (
        <form action={updateAction} style={{ marginTop: 10 }}>
          <input type="hidden" name="boardId" value={boardId} />
          <input type="hidden" name="uid" value={detail.uid} />
          {!isMemberOwner && <input type="password" name="guestPasswd" required placeholder="작성 비밀번호" />}
          {config.categories && (
            <select name="category" defaultValue={detail.category}>
              {config.categories.map((name, index) => <option key={name} value={index}>{name}</option>)}
            </select>
          )}
          {config.hasContact && <input type="text" name="contact" required defaultValue={detail.contact} placeholder="연락처" />}
          <input type="text" name="subject" required defaultValue={detail.subject} placeholder="제목" />
          <textarea name="content" required defaultValue={detail.content} rows={8} />
          {config.secretType === "optional" && (
            <label><input type="checkbox" name="secret" defaultChecked={detail.secret} /> 비밀글</label>
          )}
          {updateState.error && <p className="colorRed size12">{updateState.error}</p>}
          <button type="submit" disabled={updating}>{updating ? "수정 중..." : "수정 저장"}</button>
        </form>
      )}
      <form action={deleteAction} style={{ display: "inline", marginLeft: 8 }}>
        <input type="hidden" name="boardId" value={boardId} />
        <input type="hidden" name="uid" value={detail.uid} />
        {!isMemberOwner && <input type="password" name="guestPasswd" required placeholder="삭제 비밀번호" />}
        <button type="submit" disabled={deleting}>{deleting ? "삭제 중..." : "삭제"}</button>
        {deleteState.error && <span className="colorRed size12">{deleteState.error}</span>}
      </form>
    </div>
  );
}
