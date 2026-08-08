import { notFound } from "next/navigation";
import { BOARD_CONFIG, getPostComments, getPostDetail, isBoardId } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";
import { BoardPostBody } from "@/components/BoardPostBody";
import { SecretPostUnlock } from "@/components/SecretPostUnlock";
import { BoardCommentSection } from "@/components/BoardCommentSection";

// Port of board/view.php.
export default async function BoardDetailPage({ params }: { params: Promise<{ boardId: string; uid: string }> }) {
  const { boardId, uid: uidParam } = await params;
  if (!isBoardId(boardId)) notFound();

  const uid = Number(uidParam);
  if (!Number.isInteger(uid)) notFound();

  const config = BOARD_CONFIG[boardId];
  const session = await getSession();
  const detail = await getPostDetail(boardId, uid, session ? { memberId: session.userId } : null);
  if (!detail) notFound();

  const comments = config.comments && detail.viewable ? await getPostComments(uid) : [];

  return (
    <div id="contents">
      <h2 className="contentTitle">{config.name}</h2>
      <div className="empty30" />

      {detail.viewable ? (
        <BoardPostBody boardId={boardId} detail={detail} />
      ) : (
        <SecretPostUnlock boardId={boardId} uid={uid} showComments={config.comments} canWriteComment={config.commentAuthor !== "admin"} />
      )}

      {config.comments && detail.viewable && (
        <BoardCommentSection
          boardId={boardId}
          postUid={uid}
          comments={comments}
          isMember={Boolean(session)}
          canWrite={config.commentAuthor !== "admin"}
        />
      )}

      <div className="empty20">
        <a href={`/board/${boardId}`}>목록으로</a>
      </div>
    </div>
  );
}
