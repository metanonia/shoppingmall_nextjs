import { getGoodsBulkEditList } from "@shoppingmall/core";
import { GoodsBulkEditForm } from "@/components/GoodsBulkEditForm";

export default async function GoodsBulkEditPage({ searchParams }: { searchParams: Promise<{ page?: string; keyword?: string }> }) {
  const { page: pageParam, keyword } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const result = await getGoodsBulkEditList({ keyword }, page);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>상품 일괄수정</h1>
      <form method="get" style={{ marginBottom: 16 }}>
        <input type="text" name="keyword" placeholder="상품명/상품코드" defaultValue={keyword} />
        <button type="submit">검색</button>
      </form>

      <GoodsBulkEditForm items={result.items} />

      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/goods/bulk-edit?page=${p}`} style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
