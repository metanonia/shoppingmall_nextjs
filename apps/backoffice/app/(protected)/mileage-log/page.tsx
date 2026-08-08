import { getMileageLogList } from "@shoppingmall/core";
import { deleteMileageEntryAction, restoreMileageEntryAction } from "./actions";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleString("ko-KR");
}

export default async function MileageLogPage({ searchParams }: { searchParams: Promise<{ page?: string; keyword?: string }> }) {
  const { page: pageParam, keyword } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const result = await getMileageLogList({ keyword }, page);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>마일리지 내역</h1>
      <form method="get" style={{ marginBottom: 16 }}>
        <input type="text" name="keyword" placeholder="아이디/내용" defaultValue={keyword} />
        <button type="submit">검색</button>
      </form>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>아이디</th>
            <th>내용</th>
            <th>적립</th>
            <th>사용</th>
            <th>주문번호</th>
            <th>처리자</th>
            <th>일시</th>
            <th>상태</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((r) => (
            <tr key={r.uid} style={r.deleted ? { color: "#bbb", textDecoration: "line-through" } : undefined}>
              <td>{r.memberId}</td>
              <td>{r.content}</td>
              <td>{r.mileage > 0 ? `+${formatWon(r.mileage)}` : "-"}</td>
              <td>{r.useMileage > 0 ? `-${formatWon(r.useMileage)}` : "-"}</td>
              <td>{r.orderNum || "-"}</td>
              <td>{r.procId || "-"}</td>
              <td>{formatDate(r.signdate)}</td>
              <td>{r.deleted ? "삭제됨" : "정상"}</td>
              <td>
                {r.deleted ? (
                  <form action={restoreMileageEntryAction}>
                    <input type="hidden" name="uid" value={r.uid} />
                    <button type="submit">복구</button>
                  </form>
                ) : (
                  <form action={deleteMileageEntryAction}>
                    <input type="hidden" name="uid" value={r.uid} />
                    <button type="submit">삭제</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/mileage-log?page=${p}`} style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
