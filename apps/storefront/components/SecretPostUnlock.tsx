"use client";

import { useActionState } from "react";
import type { BoardId } from "@shoppingmall/core";
import { unlockSecretPostAction, type UnlockPostFormState } from "@/app/board/[boardId]/actions";
import { BoardPostBody } from "@/components/BoardPostBody";
import { BoardCommentSection } from "@/components/BoardCommentSection";

// Guest-side counterpart to a member's automatic ownership unlock (handled
// server-side in getPostDetail) — same password-gate pattern as
// GuestOrderLookup.tsx.
export function SecretPostUnlock({
  boardId,
  uid,
  showComments,
  canWriteComment,
}: {
  boardId: BoardId;
  uid: number;
  showComments: boolean;
  canWriteComment: boolean;
}) {
  const [state, formAction, pending] = useActionState<UnlockPostFormState, FormData>(unlockSecretPostAction, {});

  if (state.detail) {
    return (
      <>
        <BoardPostBody boardId={boardId} detail={state.detail} />
        {showComments && (
          <BoardCommentSection boardId={boardId} postUid={uid} comments={state.comments ?? []} isMember={false} canWrite={canWriteComment} />
        )}
      </>
    );
  }

  return (
    <div>
      <div className="colorGray size12">비밀글입니다. 작성 시 입력한 비밀번호를 입력해 주세요.</div>
      <div className="empty10" />
      <form action={formAction}>
        <input type="hidden" name="boardId" value={boardId} />
        <input type="hidden" name="uid" value={uid} />
        <input type="password" name="guestPasswd" placeholder="비밀번호" required />
        <button type="submit" disabled={pending}>
          확인
        </button>
      </form>
      {state.error && <div className="colorRed size12">{state.error}</div>}
    </div>
  );
}
