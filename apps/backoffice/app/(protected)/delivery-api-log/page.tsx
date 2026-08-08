import { getDeliveryApiLogList } from "@shoppingmall/core";

const STATUS_LABEL: Record<number, string> = { 0: "상태변동없음", 1: "배송완료처리", 2: "연동오류" };

function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleString("ko-KR");
}

export default async function DeliveryApiLogPage({ searchParams }: { searchParams: Promise<{ page?: string; keyword?: string }> }) {
  const { page: pageParam, keyword } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const result = await getDeliveryApiLogList({ keyword }, page);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>배송추적 API 연동 로그</h1>
      <form method="get" style={{ marginBottom: 16 }}>
        <input type="text" name="keyword" placeholder="주문번호" defaultValue={keyword} />
        <button type="submit">검색</button>
      </form>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>주문번호</th>
            <th>택배사</th>
            <th>송장번호</th>
            <th>상태</th>
            <th>메시지</th>
            <th>일시</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((r) => (
            <tr key={r.uid}>
              <td>
                <a href={`/orders/${r.orderNum}`}>{r.orderNum}</a>
              </td>
              <td>{r.deliveryName}</td>
              <td>{r.deliveryNum}</td>
              <td style={{ color: r.status === 2 ? "#e02020" : undefined }}>{STATUS_LABEL[r.status] ?? r.status}</td>
              <td>{r.message || "-"}</td>
              <td>{formatDate(r.signdate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.items.length === 0 && <div style={{ color: "#999", marginTop: 12 }}>연동 로그가 없습니다.</div>}
      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/delivery-api-log?page=${p}`} style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
