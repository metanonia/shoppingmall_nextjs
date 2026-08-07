// Port of lib/lib.Shop.php's priceLimit() and getGoodsPrice() for the
// guest (no member, no member-level discount, no personal coupon) case.
// Member-level pricing and coupon-aware pricing are out of scope for Phase 1
// (see the migration plan) and are ported alongside the member/login phase.

export type PriceLimitConfig = {
  goodsPriceLimit1: number; // rounding unit
  goodsPriceLimit2: number; // 1=floor, 2=round, 3=ceil
};

// lib/lib.Shop.php:841 priceLimit($price)
export function priceLimit(price: number, config: PriceLimitConfig): number {
  const { goodsPriceLimit1: type1, goodsPriceLimit2: type2 } = config;
  if (!type1 || !type2) return price;

  const unit = 10 * type1;
  if (type2 === 1) return Math.floor(price / unit) * unit;
  if (type2 === 2) return Math.round(price / unit) * unit;
  return Math.ceil(price / unit) * unit;
}

/** uid -> discount percent, from active exhibitions (status=2, discount_yn='Y', discount>0). */
export type EventDiscountMap = Map<number, number>;

export type GoodsPriceResult = {
  price: number;
  eventDiscountPct: number;
  saleAmount: number;
};

// Port of lib/lib.Shop.php:247 getGoodsPrice($price, $uid, $exhibition), guest path only:
// member discount (my_discount) and personal/product coupons are skipped because
// there is no logged-in member in Phase 1.
export function getGoodsPrice(
  price: number,
  exhibitionField: string,
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
): GoodsPriceResult {
  let saleAmount = 0;
  let eventDiscountPct = 0;

  if (exhibitionField && exhibitionField !== ",") {
    for (const [exhibitionUid, discountPct] of eventDiscounts) {
      // legacy: preg_match("/,{$k},/i", $exhibition) — exhibition field looks like ",1,2,"
      if (exhibitionField.includes(`,${exhibitionUid},`)) {
        const eventDiscountAmount = priceLimit((price * discountPct) / 100, priceLimitConfig);
        saleAmount += eventDiscountAmount;
        eventDiscountPct = discountPct;
        price -= eventDiscountAmount;
        break;
      }
    }
  }

  return { price, eventDiscountPct, saleAmount };
}
