import { notFound } from "next/navigation";
import { BOARD_CONFIG, getPostList, isBoardId } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";

function formatDate(signdate: number): string {
  return new Date(signdate * 1000).toLocaleDateString("ko-KR");
}

// Port of board/list.php.
export default async function BoardListPage({
  params,
  searchParams,
}: {
  params: Promise<{ boardId: string }>;
  searchParams: Promise<{ page?: string; keyword?: string; category?: string }>;
}) {
  const { boardId } = await params;
  if (!isBoardId(boardId)) notFound();

  const config = BOARD_CONFIG[boardId];
  const { page: pageParam, keyword, category: categoryParam } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const category = categoryParam ? Number(categoryParam) : undefined;

  const session = await getSession();
  const result = await getPostList(boardId, { page, keyword, category, viewerId: session?.userId ?? null });

  return (
    <div id="contents">
      <h2 className="contentTitle">{config.name}</h2>
      <div className="empty30" />

      {config.categories && (
        <div className="empty10">
          <a href={`/board/${boardId}`} style={{ marginRight: 10, fontWeight: category === undefined ? "bold" : "normal" }}>
            전체
          </a>
          {config.categories.map((name, i) => (
            <a
              key={name}
              href={`/board/${boardId}?category=${i}`}
              style={{ marginRight: 10, fontWeight: category === i ? "bold" : "normal" }}
            >
              {name}
            </a>
          ))}
        </div>
      )}

      <form method="get" style={{ marginBottom: 10 }}>
        <input type="text" name="keyword" placeholder="검색어" defaultValue={keyword} />
        <button type="submit">검색</button>
      </form>

      {result.items.length === 0 ? (
        <div className="emptyList">등록된 게시물이 없습니다.</div>
      ) : (
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>제목</th>
              <th>작성자</th>
              <th>작성일</th>
              <th>조회</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((item) => (
              <tr key={item.uid} className={item.notice ? "colorRed" : undefined}>
                <td>
                  <a href={`/board/${boardId}/${item.uid}`}>
                    {item.locked && <i className="xi-lock size12" />} {item.subject}
                    {item.hasFiles && <i className="xi-paperclip size12" />}
                    {item.commentCount > 0 && ` [${item.commentCount}]`}
                  </a>
                </td>
                <td>{item.authorName}</td>
                <td>{formatDate(item.signdate)}</td>
                <td>{item.viewCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/board/${boardId}?page=${p}${category !== undefined ? `&category=${category}` : ""}${keyword ? `&keyword=${keyword}` : ""}`}
              style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}
            >
              {p}
            </a>
          ))}
        </div>
      )}

      {config.writable && (
        <div className="empty20">
          <a href={`/board/${boardId}/write`} className="fontSCDream weight300 shine black">
            글쓰기
          </a>
        </div>
      )}
    </div>
  );
}
