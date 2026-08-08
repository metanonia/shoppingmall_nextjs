import { getVendorSalesDetailList } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function formatDate(unix: number): string {
  return unix > 0 ? new Date(unix * 1000).toISOString().slice(0, 19).replace("T", " ") : "-";
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// Port of vendor/order/sales_detail.php — line-level detail behind stats/sales.
export default async function VendorSalesDetailPage({ searchParams }: { searchParams: Promise<{ dateFrom?: string; dateTo?: string }> }) {
  const session = await requireVendor();
  const { dateFrom: dateFromParam, dateTo: dateToParam } = await searchParams;
  const dateFrom = dateFromParam || daysAgoStr(30);
  const dateTo = dateToParam || todayStr();

  const items = await getVendorSalesDetailList(session.vendorId ?? "", dateFrom, dateTo);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>매출상세</h1>

      <form method="get" style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <input type="date" name="dateFrom" defaultValue={dateFrom} />
        ~
        <input type="date" name="dateTo" defaultValue={dateTo} />
        <button type="submit">조회</button>
      </form>

      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>주문번호</th>
            <th>상품명</th>
            <th>단가</th>
            <th>수량</th>
            <th>수수료</th>
            <th>확정</th>
            <th>정산</th>
            <th>주문일시</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.uid}>
              <td>{item.orderNum}</td>
              <td>{item.goodsName}</td>
              <td>{formatWon(item.price)}원</td>
              <td>{item.qty}</td>
              <td>{formatWon(item.commissionAmount)}원</td>
              <td>{item.confirmed ? "확정" : "미확정"}</td>
              <td>{item.settled ? "정산완료" : "-"}</td>
              <td>{formatDate(item.signdate)}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: "center", color: "#999" }}>
                데이터가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
