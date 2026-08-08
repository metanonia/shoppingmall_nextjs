import { notFound } from "next/navigation";
import { BOARD_CONFIG, getPostList, isBoardId } from "@shoppingmall/core";
import { deleteBoardPostAction } from "@/app/(protected)/board/actions";

function formatDate(signdate: number): string {
  return new Date(signdate * 1000).toLocaleDateString("ko-KR");
}

// Admin CRUD for notice/faq only — counsel has its own reply-focused UI at
// /board/counsel (a customer/guest question isn't something admin "writes"),
// gallery isn't managed here at all (customer content, no admin authoring).
export default async function BoardAdminListPage({
  params,
  searchParams,
}: {
  params: Promise<{ boardId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { boardId } = await params;
  if (!isBoardId(boardId) || !["notice", "faq", "vnotice"].includes(boardId)) notFound();

  const config = BOARD_CONFIG[boardId];
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const result = await getPostList(boardId, { page });

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>{config.name} 관리</h1>
      <div style={{ marginBottom: 16 }}>
        <a href={`/board/${boardId}/new`}>
          <button type="button">글쓰기</button>
        </a>
      </div>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>제목</th>
            <th>고정</th>
            <th>작성일</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((item) => (
            <tr key={item.uid}>
              <td>
                <a href={`/board/${boardId}/${item.uid}/edit`}>{item.subject}</a>
              </td>
              <td>{item.notice ? "O" : ""}</td>
              <td>{formatDate(item.signdate)}</td>
              <td>
                <form action={deleteBoardPostAction}>
                  <input type="hidden" name="boardId" value={boardId} />
                  <input type="hidden" name="uid" value={item.uid} />
                  <button type="submit">삭제</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/board/${boardId}?page=${p}`} style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
