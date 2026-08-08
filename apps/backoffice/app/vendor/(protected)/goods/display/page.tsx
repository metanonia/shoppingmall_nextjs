import { getAdminGoodsList, getDisplayGoodsList } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";
import { DisplayReorderForm, DisplaySearchForm } from "@/components/GoodsDisplayForm";
import { addGoodsToDisplayAction, removeGoodsFromDisplayAction, reorderDisplayGoodsAction } from "./actions";

const SUB_LABEL: Record<number, string> = { 1: "인기상품", 2: "추천상품", 3: "신상품" };

// Vendor twin of app/(protected)/goods/display/page.tsx, fixed to
// slot="store" (입점사 스토어 페이지 진열) — no category selector, since a
// vendor's store page groups only by their own products, not by category.
export default async function VendorGoodsDisplayPage({
  searchParams,
}: {
  searchParams: Promise<{ sub?: string; keyword?: string }>;
}) {
  const session = await requireVendor();
  const { sub: subParam, keyword } = await searchParams;
  const sub = (Number(subParam) === 2 || Number(subParam) === 3 ? Number(subParam) : 1) as 1 | 2 | 3;
  const vendorId = session.vendorId ?? "";

  const [displayed, searchResult] = await Promise.all([
    getDisplayGoodsList("store", sub, { vendorId }),
    keyword ? getAdminGoodsList({ keyword, vendor: vendorId }, 1) : Promise.resolve(null),
  ]);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>스토어 진열관리</h1>

      <div style={{ marginBottom: 16 }}>
        {[1, 2, 3].map((sb) => (
          <a
            key={sb}
            href={`/vendor/goods/display?sub=${sb}`}
            style={{ marginRight: 16, fontWeight: sub === sb ? "bold" : "normal" }}
          >
            {SUB_LABEL[sb]}
          </a>
        ))}
      </div>

      <DisplayReorderForm
        slot="store"
        sub={sub}
        items={displayed}
        actions={{ removeGoodsFromDisplay: removeGoodsFromDisplayAction, reorderDisplayGoods: reorderDisplayGoodsAction }}
      />

      <div className="empty30" />
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>상품 추가</h2>
      <DisplaySearchForm
        slot="store"
        sub={sub}
        keyword={keyword}
        results={searchResult?.items ?? []}
        actions={{ addGoodsToDisplay: addGoodsToDisplayAction }}
      />
    </div>
  );
}
