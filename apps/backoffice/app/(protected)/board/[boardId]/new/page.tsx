import { notFound } from "next/navigation";
import { BOARD_CONFIG, isBoardId } from "@shoppingmall/core";
import { BoardPostForm } from "@/components/BoardPostForm";

export default async function NewBoardPostPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  if (!isBoardId(boardId) || !["notice", "faq", "vnotice"].includes(boardId)) notFound();
  const config = BOARD_CONFIG[boardId];

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>{config.name} 글쓰기</h1>
      <BoardPostForm boardId={boardId} categories={config.categories} initial={null} />
    </div>
  );
}
