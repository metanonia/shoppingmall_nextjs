import { getAccessLogList } from "@shoppingmall/core";

const ACTOR_TYPE_LABEL: Record<string, string> = { ADMIN: "관리자", VENDOR: "입점사" };
const TYPE_LABEL: Record<number, string> = { 0: "로그인", 1: "로그아웃" };

function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleString("ko-KR");
}

export default async function AccessLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; keyword?: string; actorType?: string }>;
}) {
  const { page: pageParam, keyword, actorType } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const result = await getAccessLogList({ keyword, actorType: actorType === "ADMIN" || actorType === "VENDOR" ? actorType : undefined }, page);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>접속 로그</h1>
      <form method="get" style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <input type="text" name="keyword" placeholder="아이디/내용" defaultValue={keyword} />
        <select name="actorType" defaultValue={actorType ?? ""}>
          <option value="">전체</option>
          <option value="ADMIN">관리자</option>
          <option value="VENDOR">입점사</option>
        </select>
        <button type="submit">검색</button>
      </form>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>구분</th>
            <th>아이디</th>
            <th>내용</th>
            <th>유형</th>
            <th>IP</th>
            <th>일시</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((r) => (
            <tr key={r.uid}>
              <td>{ACTOR_TYPE_LABEL[r.actorType]}</td>
              <td>{r.actorId}</td>
              <td>{r.content}</td>
              <td>{TYPE_LABEL[r.type] ?? r.type}</td>
              <td>{r.accIp || "-"}</td>
              <td>{formatDate(r.signdate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.items.length === 0 && <div style={{ color: "#999", marginTop: 12 }}>접속 로그가 없습니다.</div>}
      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/access-log?page=${p}`} style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
