import { getOrderCancelCpLogList } from "@shoppingmall/core";
import { markOrderCancelCpLogProcessedAction } from "./actions";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleString("ko-KR");
}

export default async function OrderCancelLogPage({ searchParams }: { searchParams: Promise<{ page?: string; keyword?: string }> }) {
  const { page: pageParam, keyword } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const result = await getOrderCancelCpLogList({ keyword }, page);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>PG 취소 연동 로그</h1>
      <form method="get" style={{ marginBottom: 16 }}>
        <input type="text" name="keyword" placeholder="주문번호" defaultValue={keyword} />
        <button type="submit">검색</button>
      </form>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>주문번호</th>
            <th>취소금액</th>
            <th>잔여금액</th>
            <th>결제수단</th>
            <th>상태</th>
            <th>메시지</th>
            <th>일시</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((r) => (
            <tr key={r.uid}>
              <td>
                <a href={`/orders/${r.orderNum}`}>{r.orderNum}</a>
              </td>
              <td>{formatWon(r.price)}원</td>
              <td>{formatWon(r.remPrice)}원</td>
              <td>{r.payType}</td>
              <td style={{ color: r.status === 1 ? "#e02020" : undefined }}>{r.status === 1 ? "연동오류" : "정상"}</td>
              <td>{r.message}</td>
              <td>{formatDate(r.signdate)}</td>
              <td>
                {r.status === 1 && !r.proc && (
                  <form action={markOrderCancelCpLogProcessedAction}>
                    <input type="hidden" name="uid" value={r.uid} />
                    <button type="submit">수동처리 완료</button>
                  </form>
                )}
                {r.proc && "처리완료"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.items.length === 0 && <div style={{ color: "#999", marginTop: 12 }}>취소 연동 로그가 없습니다.</div>}
      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/order-cancel-log?page=${p}`} style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
