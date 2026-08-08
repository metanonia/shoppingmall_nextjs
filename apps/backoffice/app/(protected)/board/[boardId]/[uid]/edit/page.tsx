import { notFound } from "next/navigation";
import { BOARD_CONFIG, getPostDetail, isBoardId } from "@shoppingmall/core";
import { BoardPostForm } from "@/components/BoardPostForm";

export default async function EditBoardPostPage({ params }: { params: Promise<{ boardId: string; uid: string }> }) {
  const { boardId, uid: uidParam } = await params;
  if (!isBoardId(boardId) || !["notice", "faq", "vnotice"].includes(boardId)) notFound();
  const uid = Number(uidParam);
  if (!Number.isInteger(uid)) notFound();

  const config = BOARD_CONFIG[boardId];
  // Admin editing bypasses secret gating entirely (no secret content on
  // notice/faq anyway) — pass no viewer, viewable will be true since these
  // boards are never secret.
  const detail = await getPostDetail(boardId, uid, null, { incrementView: false });
  if (!detail) notFound();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>{config.name} 수정</h1>
      <BoardPostForm
        boardId={boardId}
        categories={config.categories}
        initial={{ uid: detail.uid, subject: detail.subject, content: detail.content, category: detail.category, notice: detail.notice }}
      />
    </div>
  );
}
