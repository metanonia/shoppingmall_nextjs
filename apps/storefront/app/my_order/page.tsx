import { redirect } from "next/navigation";
import { getMyOrders } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";

const PAY_TYPE_LABELS: Record<string, string> = { B: "무통장입금", C: "카드", R: "실시간계좌이체", V: "가상계좌", H: "휴대폰", M: "마일리지" };

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// Port of php/order_list.php.
export default async function MyOrderPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login?redirect_to=/my_order");

  const { page: pageParam } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const result = await getMyOrders(session.userId, page);

  return (
    <div id="contents">
      <h2 className="contentTitle">주문내역</h2>
      <div className="empty30" />

      {result.items.length === 0 ? (
        <div className="emptyList">주문 내역이 없습니다.</div>
      ) : (
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>주문번호</th>
              <th>상품</th>
              <th>결제수단</th>
              <th>결제금액</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((order) => (
              <tr key={order.orderNum}>
                <td>
                  <a href={`/my_order/${order.orderNum}`}>{order.orderNum}</a>
                </td>
                <td>
                  {order.lines[0]?.goodsName}
                  {order.lines.length > 1 && ` 외 ${order.lines.length - 1}건`}
                </td>
                <td>{PAY_TYPE_LABELS[order.payType] ?? order.payType}</td>
                <td>{formatWon(order.payTotal)}원</td>
                <td>{order.lines[0]?.statusLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/my_order?page=${p}`} style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
