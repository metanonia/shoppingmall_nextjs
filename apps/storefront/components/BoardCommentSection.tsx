"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { BoardId, PostComment } from "@shoppingmall/core";
import { createCommentAction, type CreateCommentFormState } from "@/app/board/[boardId]/actions";

function formatDate(signdate: number): string {
  return new Date(signdate * 1000).toLocaleDateString("ko-KR");
}

// gallery-only (see BOARD_CONFIG.gallery.comments) — the only in-scope
// board where legacy exposes customer comments. router.refresh() re-runs
// the server component's getPostComments() fetch after a successful post,
// since this client component only holds the comments it was first given.
export function BoardCommentSection({
  boardId,
  postUid,
  comments,
  isMember,
}: {
  boardId: BoardId;
  postUid: number;
  comments: PostComment[];
  isMember: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CreateCommentFormState, FormData>(createCommentAction, {});

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <div className="empty30">
      <div className="sub_title">댓글 {comments.length}</div>
      <ul>
        {comments.map((comment) => (
          <li key={comment.uid} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
            <div className="colorGray size12">
              {comment.authorName} · {formatDate(comment.signdate)}
            </div>
            <div>{comment.content}</div>
          </li>
        ))}
      </ul>

      <form action={formAction} className="empty10">
        <input type="hidden" name="boardId" value={boardId} />
        <input type="hidden" name="postUid" value={postUid} />
        {!isMember && (
          <>
            <input type="text" name="guestName" placeholder="이름" required />
            <input type="password" name="guestPasswd" placeholder="비밀번호" required />
          </>
        )}
        <textarea name="content" placeholder="댓글을 입력해 주세요." rows={2} required />
        {state.error && <div className="colorRed size12">{state.error}</div>}
        <button type="submit" disabled={pending}>
          댓글 등록
        </button>
      </form>
    </div>
  );
}
