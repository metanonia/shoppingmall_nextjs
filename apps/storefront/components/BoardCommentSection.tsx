"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BoardId, PostComment } from "@shoppingmall/core";
import {
  createCommentAction,
  deleteOwnCommentAction,
  type CreateCommentFormState,
  type ManagePostFormState,
} from "@/app/board/[boardId]/actions";

function formatDate(signdate: number): string {
  return new Date(signdate * 1000).toLocaleDateString("ko-KR");
}

// gallery: any customer can write (see BOARD_CONFIG.gallery.commentAuthor).
// counsel reuses this same component to show the admin's reply, but
// commentAuthor:"admin" there means customers can only ever read — `canWrite`
// (computed by the page from config.commentAuthor) hides the form in that
// case. router.refresh() re-runs the server component's getPostComments()
// fetch after a successful post, since this client component only holds the
// comments it was first given.
export function BoardCommentSection({
  boardId,
  postUid,
  comments,
  memberId,
  canWrite,
}: {
  boardId: BoardId;
  postUid: number;
  comments: PostComment[];
  memberId: string | null;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<CreateCommentFormState, FormData>(createCommentAction, {});

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <div className="empty30">
      <div className="sub_title">{canWrite ? `댓글 ${comments.length}` : "답변"}</div>
      <ul>
        {comments.map((comment) => (
          <CommentItem key={comment.uid} boardId={boardId} postUid={postUid} comment={comment} memberId={memberId} canReply={canWrite} />
        ))}
      </ul>
      {comments.length === 0 && !canWrite && <div className="colorGray size12">아직 답변이 등록되지 않았습니다.</div>}

      {canWrite && (
        <form action={formAction} className="empty10">
          <input type="hidden" name="boardId" value={boardId} />
          <input type="hidden" name="postUid" value={postUid} />
          {!memberId && (
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
      )}
    </div>
  );
}

function CommentItem({ boardId, postUid, comment, memberId, canReply }: { boardId: BoardId; postUid: number; comment: PostComment; memberId: string | null; canReply: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ManagePostFormState, FormData>(deleteOwnCommentAction, {});
  const [replyState, replyAction, replying] = useActionState<CreateCommentFormState, FormData>(createCommentAction, {});
  const [showReply, setShowReply] = useState(false);
  const memberOwner = Boolean(memberId && comment.authorId === memberId);
  const canAttemptDelete = memberOwner || !comment.authorId;

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);
  useEffect(() => {
    if (replyState.success) router.refresh();
  }, [replyState.success, router]);

  return (
    <li style={{ borderBottom: "1px solid #eee", padding: "10px 0", marginLeft: Math.min(comment.depth, 5) * 20 }}>
            <div className="colorGray size12">
              {comment.authorName} · {formatDate(comment.signdate)}
            </div>
            <div>{comment.content}</div>
      {canAttemptDelete && (
        <form action={action}>
          <input type="hidden" name="boardId" value={boardId} />
          <input type="hidden" name="postUid" value={postUid} />
          <input type="hidden" name="commentUid" value={comment.uid} />
          {!memberOwner && <input type="password" name="guestPasswd" required placeholder="댓글 비밀번호" />}
          <button type="submit" disabled={pending}>삭제</button>
          {state.error && <span className="colorRed size12">{state.error}</span>}
        </form>
      )}
      {canReply && <button type="button" onClick={() => setShowReply((value) => !value)}>답글</button>}
      {showReply && <form action={replyAction}>
        <input type="hidden" name="boardId" value={boardId} /><input type="hidden" name="postUid" value={postUid} /><input type="hidden" name="parentUid" value={comment.uid} />
        {!memberId && <><input name="guestName" required placeholder="이름" /><input type="password" name="guestPasswd" required placeholder="비밀번호" /></>}
        <textarea name="content" required rows={2} placeholder="답글을 입력해 주세요." />
        <button type="submit" disabled={replying}>답글 등록</button>{replyState.error && <span className="colorRed size12">{replyState.error}</span>}{replyState.success && <span className="size12">등록되었습니다.</span>}
      </form>}
    </li>
  );
}
