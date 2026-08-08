import { getAdminCategoryTree, getAdminGoodsList, getDisplayGoodsList, type AdminCategoryNode } from "@shoppingmall/core";
import { DisplayReorderForm, DisplaySearchForm } from "@/components/GoodsDisplayForm";

const SUB_LABEL: Record<number, string> = { 1: "인기상품", 2: "추천상품", 3: "신상품" };

function flattenCategories(nodes: AdminCategoryNode[], depth = 0): { cate: string; name: string }[] {
  return nodes.flatMap((n) => [{ cate: n.cate.toString(), name: `${"　".repeat(depth)}${n.name}` }, ...flattenCategories(n.children, depth + 1)]);
}

export default async function GoodsDisplayPage({
  searchParams,
}: {
  searchParams: Promise<{ slot?: string; sub?: string; cate?: string; keyword?: string }>;
}) {
  const { slot: slotParam, sub: subParam, cate: cateParam, keyword } = await searchParams;
  const slot = slotParam === "main2" ? "main2" : "main1";
  const sub = (Number(subParam) === 2 || Number(subParam) === 3 ? Number(subParam) : 1) as 1 | 2 | 3;

  const categoryTree = await getAdminCategoryTree();
  const flatCategories = flattenCategories(categoryTree);
  const cate = slot === "main2" ? BigInt(cateParam || flatCategories[0]?.cate || "0") : undefined;

  const [displayed, searchResult] = await Promise.all([
    getDisplayGoodsList(slot, sub, { cate }),
    keyword ? getAdminGoodsList({ keyword }, 1) : Promise.resolve(null),
  ]);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>상품 진열관리</h1>

      <div style={{ marginBottom: 16 }}>
        {(["main1", "main2"] as const).map((s) => (
          <span key={s} style={{ marginRight: 16 }}>
            <b>{s === "main1" ? "홈 메인 진열" : "카테고리별 메인 진열"}</b>
            {[1, 2, 3].map((sb) => (
              <a
                key={sb}
                href={`/goods/display?slot=${s}&sub=${sb}${s === "main2" ? `&cate=${cate ?? flatCategories[0]?.cate}` : ""}`}
                style={{ marginLeft: 8, fontWeight: slot === s && sub === sb ? "bold" : "normal" }}
              >
                {SUB_LABEL[sb]}
              </a>
            ))}
          </span>
        ))}
      </div>

      {slot === "main2" && (
        <form method="get" style={{ marginBottom: 16 }}>
          <input type="hidden" name="slot" value={slot} />
          <input type="hidden" name="sub" value={sub} />
          <select name="cate" defaultValue={cate?.toString()}>
            {flatCategories.map((c) => (
              <option key={c.cate} value={c.cate}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit">카테고리 선택</button>
        </form>
      )}

      <DisplayReorderForm slot={slot} sub={sub} cate={cate?.toString()} items={displayed} />

      <div className="empty30" />
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>상품 추가</h2>
      <DisplaySearchForm slot={slot} sub={sub} keyword={keyword} results={searchResult?.items ?? []} />
    </div>
  );
}
