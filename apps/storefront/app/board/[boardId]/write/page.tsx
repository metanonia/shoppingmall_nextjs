import { notFound } from "next/navigation";
import { BOARD_CONFIG, isBoardId } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";
import { BoardWriteForm } from "@/components/BoardWriteForm";

// Port of board/board_post.php's write form (board_id=0, mode=write path).
export default async function BoardWritePage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  if (!isBoardId(boardId)) notFound();

  const config = BOARD_CONFIG[boardId];
  if (!config.writable) notFound();

  const session = await getSession();

  return (
    <div id="contents">
      <h2 className="contentTitle">{config.name} 글쓰기</h2>
      <div className="empty30" />
      <BoardWriteForm boardId={boardId} config={config} isMember={Boolean(session)} />
    </div>
  );
}
