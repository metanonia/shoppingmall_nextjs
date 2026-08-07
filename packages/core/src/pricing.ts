// Port of lib/lib.Shop.php's priceLimit() and getGoodsPrice(). Member-level
// discount (my_discount) is applied; personal/product coupons are still out
// of scope (mallRN_coupon doesn't exist yet — needs the cart/order tables).

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
  memberDiscountPct: number;
  saleAmount: number;
};

// Port of lib/lib.Shop.php:247 getGoodsPrice($price, $uid, $exhibition).
// Personal/product coupons are still skipped — mallRN_coupon needs the
// cart/order tables (Phase 4).
export function getGoodsPrice(
  price: number,
  exhibitionField: string,
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
  memberDiscountPct = 0,
): GoodsPriceResult {
  const origPrice = price;
  let saleAmount = 0;
  let eventDiscountPct = 0;

  if (exhibitionField && exhibitionField !== ",") {
    for (const [exhibitionUid, discountPct] of eventDiscounts) {
      // legacy: preg_match("/,{$k},/i", $exhibition) — exhibition field looks like ",1,2,"
      if (exhibitionField.includes(`,${exhibitionUid},`)) {
        const eventDiscountAmount = priceLimit((origPrice * discountPct) / 100, priceLimitConfig);
        saleAmount += eventDiscountAmount;
        eventDiscountPct = discountPct;
        price -= eventDiscountAmount;
        break;
      }
    }
  }

  // legacy applies this against orig_price too, not the already
  // event-discounted price (lib.Shop.php:281-283).
  if (memberDiscountPct > 0) {
    const memberDiscountAmount = priceLimit((origPrice * memberDiscountPct) / 100, priceLimitConfig);
    saleAmount += memberDiscountAmount;
    price -= memberDiscountAmount;
  }

  return { price, eventDiscountPct, memberDiscountPct, saleAmount };
}
