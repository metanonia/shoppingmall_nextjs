import { getVendorOrderList } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";

function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString("ko-KR");
}

export default async function VendorOrderListPage({ searchParams }: { searchParams: Promise<{ page?: string; keyword?: string }> }) {
  const session = await requireVendor();
  const { page: pageParam, keyword } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const result = await getVendorOrderList(session.vendorId ?? "", { keyword }, page);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>주문관리</h1>
      <form method="get" style={{ marginBottom: 16 }}>
        <input type="text" name="keyword" placeholder="주문번호/상품명" defaultValue={keyword} />
        <button type="submit">검색</button>
      </form>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>주문번호</th>
            <th>주문자</th>
            <th>상품</th>
            <th>주문일</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((o) => (
            <tr key={o.orderNum}>
              <td>
                <a href={`/vendor/orders/${o.orderNum}`}>{o.orderNum}</a>
              </td>
              <td>{o.buyerName}</td>
              <td>{o.itemSummary}</td>
              <td>{formatDate(o.signdate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/vendor/orders?page=${p}`} style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
