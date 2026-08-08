import { getAdminGoodsList } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export default async function VendorGoodsListPage({ searchParams }: { searchParams: Promise<{ page?: string; keyword?: string }> }) {
  const session = await requireVendor();
  const { page: pageParam, keyword } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const result = await getAdminGoodsList({ keyword, vendor: session.vendorId ?? "" }, page);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>상품관리</h1>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <form method="get">
          <input type="text" name="keyword" placeholder="상품명/상품코드" defaultValue={keyword} />
          <button type="submit">검색</button>
        </form>
        <a href="/vendor/goods/new">
          <button type="button">상품 등록</button>
        </a>
      </div>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>상품명</th>
            <th>가격</th>
            <th>재고</th>
            <th>진열</th>
            <th>승인상태</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((g) => (
            <tr key={g.uid}>
              <td>
                <a href={`/vendor/goods/${g.uid}/edit`}>{g.name}</a>
              </td>
              <td>{formatWon(g.price)}원</td>
              <td>{g.qty}</td>
              <td>{g.displayUse ? "O" : "X"}</td>
              <td>{g.authCk === "Y" ? "승인" : "승인대기"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/vendor/goods?page=${p}`} style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
