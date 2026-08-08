import { getSmsLogList } from "@shoppingmall/core";

function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleString("ko-KR");
}

export default async function SmsLogPage({ searchParams }: { searchParams: Promise<{ page?: string; keyword?: string }> }) {
  const { page: pageParam, keyword } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const result = await getSmsLogList({ keyword }, page);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>SMS 발송이력</h1>
      <form method="get" style={{ marginBottom: 16 }}>
        <input type="text" name="keyword" placeholder="휴대폰번호/내용" defaultValue={keyword} />
        <button type="submit">검색</button>
      </form>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>휴대폰번호</th>
            <th>내용</th>
            <th>결과</th>
            <th>발송일시</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((r) => (
            <tr key={r.uid}>
              <td>{r.cell}</td>
              <td>{r.message}</td>
              <td>{r.result}</td>
              <td>{formatDate(r.signdate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.items.length === 0 && <div style={{ color: "#999", marginTop: 12 }}>발송 이력이 없습니다.</div>}
      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/sms-log?page=${p}`} style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
