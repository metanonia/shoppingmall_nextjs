import { getDbErrorLogList } from "@shoppingmall/core";
import { markDbErrorLogProcessedAction } from "./actions";

function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleString("ko-KR");
}

export default async function DbErrorLogPage({ searchParams }: { searchParams: Promise<{ page?: string; keyword?: string }> }) {
  const { page: pageParam, keyword } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const result = await getDbErrorLogList({ keyword }, page);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>오류 로그</h1>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>
        cron 작업(일일배치/배송추적)이 실패했을 때 여기에 기록됩니다.
      </div>
      <form method="get" style={{ marginBottom: 16 }}>
        <input type="text" name="keyword" placeholder="발생위치/메시지" defaultValue={keyword} />
        <button type="submit">검색</button>
      </form>
      {result.items.map((r) => (
        <div key={r.uid} style={{ border: "1px solid #eee", padding: 12, borderRadius: 6, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <b>{r.name}</b>
            <span style={{ color: "#999", fontSize: 12 }}>{formatDate(r.signdate)}</span>
          </div>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 6, color: "#555" }}>{r.message}</pre>
          <div style={{ marginTop: 8 }}>
            {r.status === 1 ? (
              <span style={{ color: "#2a8" }}>처리완료</span>
            ) : (
              <form action={markDbErrorLogProcessedAction}>
                <input type="hidden" name="uid" value={r.uid} />
                <button type="submit">처리완료로 표시</button>
              </form>
            )}
          </div>
        </div>
      ))}
      {result.items.length === 0 && <div style={{ color: "#999", marginTop: 12 }}>오류 로그가 없습니다.</div>}
      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/db-error-log?page=${p}`} style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
