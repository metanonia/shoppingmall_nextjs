import { getActiveEventDiscounts, getBestSellingGoodsList, priceLimitConfigFrom } from "@shoppingmall/core";
import { getCachedMemberDiscountPct, getCachedShopConfig, getDevice } from "@/lib/request";
import { GoodsGrid } from "@/components/GoodsGrid";

// Port of php/best.php — a fixed top-50 ranking, no sort/limit/pagination
// controls in the original (weekly order-count ranking padded with an
// all-time popularity fallback; only the fallback is wired until orders
// exist — see listing.ts's getBestSellingGoodsList).
export default async function BestGoodsPage() {
  const [device, config, memberDiscountPct] = await Promise.all([
    getDevice(),
    getCachedShopConfig(),
    getCachedMemberDiscountPct(),
  ]);
  const eventDiscounts = await getActiveEventDiscounts();
  const items = await getBestSellingGoodsList(50, eventDiscounts, priceLimitConfigFrom(config), memberDiscountPct);

  return (
    <div id="contents">
      <div className="empty20" />
      <div className="secCateName">베스트 상품</div>
      <div className="empty30" />
      <GoodsGrid goods={items} device={device} />
    </div>
  );
}
