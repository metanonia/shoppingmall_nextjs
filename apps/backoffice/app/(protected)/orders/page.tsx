import { getAdminOrderList } from "@shoppingmall/core";

const PAY_TYPE_LABELS: Record<string, string> = { B: "무통장입금", C: "카드", R: "실시간계좌이체", V: "가상계좌", H: "휴대폰", M: "마일리지" };
const PAY_STATUS_LABELS: Record<string, string> = { A: "입금대기", B: "미확인", C: "결제완료", D: "결제실패" };

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function formatDate(signdate: number): string {
  return new Date(signdate * 1000).toLocaleDateString("ko-KR");
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; keyword?: string; payStatus?: string; payType?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1) || 1;
  const result = await getAdminOrderList(
    {
      keyword: params.keyword,
      payStatus: params.payStatus as "A" | "B" | "C" | "D" | undefined,
      payType: params.payType as "B" | "C" | "R" | "V" | "H" | "M" | undefined,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    },
    page,
  );

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>주문관리</h1>

      <form method="get" style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <input type="text" name="keyword" placeholder="주문번호/아이디/이름/연락처/이메일" defaultValue={params.keyword} />
        <select name="payStatus" defaultValue={params.payStatus ?? ""}>
          <option value="">결제상태 전체</option>
          <option value="A">입금대기</option>
          <option value="C">결제완료</option>
        </select>
        <select name="payType" defaultValue={params.payType ?? ""}>
          <option value="">결제수단 전체</option>
          {Object.entries(PAY_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input type="date" name="dateFrom" defaultValue={params.dateFrom} />
        <input type="date" name="dateTo" defaultValue={params.dateTo} />
        <button type="submit">검색</button>
      </form>

      {result.items.length === 0 ? (
        <div>주문이 없습니다.</div>
      ) : (
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>주문번호</th>
              <th>주문일</th>
              <th>주문자</th>
              <th>상품</th>
              <th>결제수단</th>
              <th>결제상태</th>
              <th>금액</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((order) => (
              <tr key={order.orderNum}>
                <td>
                  <a href={`/orders/${order.orderNum}`}>{order.orderNum}</a>
                </td>
                <td>{formatDate(order.signdate)}</td>
                <td>
                  {order.name} ({order.buyerId})
                </td>
                <td>{order.itemSummary}</td>
                <td>{PAY_TYPE_LABELS[order.payType] ?? order.payType}</td>
                <td>{PAY_STATUS_LABELS[order.payStatus] ?? order.payStatus}</td>
                <td>{formatWon(order.payTotal)}원</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/orders?page=${p}`} style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
