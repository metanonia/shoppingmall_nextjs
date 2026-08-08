import { getAdminGoodsList } from "@shoppingmall/core";
import { approveGoodsAuthAction } from "@/app/(protected)/goods/actions";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export default async function GoodsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; keyword?: string; pending?: string }>;
}) {
  const { page: pageParam, keyword, pending } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const result = await getAdminGoodsList({ keyword, authCk: pending === "1" ? "N" : undefined }, page);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>상품관리</h1>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <form method="get" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="text" name="keyword" placeholder="상품명/상품코드" defaultValue={keyword} />
          <label>
            <input type="checkbox" name="pending" value="1" defaultChecked={pending === "1"} /> 승인대기만
          </label>
          <button type="submit">검색</button>
        </form>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={`/goods/export?${new URLSearchParams({ ...(keyword ? { keyword } : {}), ...(pending ? { pending } : {}) }).toString()}`}>
            <button type="button">엑셀 다운로드</button>
          </a>
          <a href="/goods/new">
            <button type="button">상품 등록</button>
          </a>
        </div>
      </div>

      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>상품명</th>
            <th>입점사</th>
            <th>가격</th>
            <th>재고</th>
            <th>진열</th>
            <th>판매</th>
            <th>승인상태</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((g) => (
            <tr key={g.uid}>
              <td>
                <a href={`/goods/${g.uid}/edit`}>{g.name}</a>
              </td>
              <td>{g.vendor || "직영"}</td>
              <td>{formatWon(g.price)}원</td>
              <td>{g.qty}</td>
              <td>{g.displayUse ? "O" : "X"}</td>
              <td>{g.saleUse ? "O" : "X"}</td>
              <td>{g.authCk === "Y" ? "승인" : "승인대기"}</td>
              <td>
                {g.authCk === "N" && (
                  <form action={approveGoodsAuthAction}>
                    <input type="hidden" name="uid" value={g.uid} />
                    <input type="hidden" name="authCk" value="Y" />
                    <button type="submit">승인</button>
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
            <a key={p} href={`/goods?page=${p}`} style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
