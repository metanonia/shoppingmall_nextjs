import { getPostList } from "@shoppingmall/core";

function formatDate(signdate: number): string {
  return new Date(signdate * 1000).toLocaleDateString("ko-KR");
}

export default async function CounselAdminPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const result = await getPostList("counsel", { page });

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>1:1문의 관리</h1>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>제목</th>
            <th>작성자</th>
            <th>작성일</th>
            <th>답변상태</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((item) => (
            <tr key={item.uid}>
              <td>
                <a href={`/board/counsel/${item.uid}`}>{item.subject}</a>
              </td>
              <td>{item.authorName}</td>
              <td>{formatDate(item.signdate)}</td>
              <td>{item.commentCount > 0 ? "답변완료" : "미답변"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/board/counsel?page=${p}`} style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
