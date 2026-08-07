import type { Goods } from "@shoppingmall/db";
import { type EventDiscountMap, type PriceLimitConfig, getGoodsPrice, priceLimit } from "./pricing";

export type GoodsCardViewModel = {
  uid: number;
  name: string;
  nameCodeAble: string;
  link: string;
  image: string;
  icons: string[];
  price: string;
  soldOut: boolean;
  hasCoupon: boolean;
  salePct: number | null;
  origPrice: string | null;
};

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// Port of lib/lib.Shop.php:929 getGoodsInfo($row, $tname), guest/no-coupon path.
// The `is_soldout` / `is_coupon` / `is_sale` / `is_orig_price` DYNAMIC regions in
// main.html/mobile_main.html become plain boolean fields here.
export function toGoodsCard(
  row: Goods,
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
): GoodsCardViewModel {
  const link = `/goods/${row.uid}`;
  const image = row.image2 ? `/image/goods/${row.image2}` : "/image/no_image.png";

  const icons = row.icon ? row.icon.split("|").filter(Boolean) : [];

  let priceText: string;
  let salePct: number | null = null;
  let origPrice: string | null = null;

  if (row.price_ment) {
    priceText = row.price_ment;
  } else {
    const defaultPrice = row.price;
    const { price, eventDiscountPct } = getGoodsPrice(
      row.price,
      row.exhibition,
      eventDiscounts,
      priceLimitConfig,
    );
    priceText = formatWon(price);

    // guest path: SALE = EVENT_DISCOUNT only (member-level discount is 0 with no login)
    if (eventDiscountPct > 0) {
      salePct = eventDiscountPct;
      origPrice = formatWon(defaultPrice);
    }
  }

  let soldOut = false;
  if (row.sale_use === 0) soldOut = true;
  else if (row.option_use === 1) {
    if (row.option_soldout === 2) soldOut = true;
  } else if (row.qty_type === 0 && row.qty < 1) soldOut = true;

  return {
    uid: row.uid,
    name: row.name,
    nameCodeAble: row.name_code_able,
    link,
    image,
    icons,
    price: priceText,
    soldOut,
    hasCoupon: false, // Phase 1 has no member/coupon pricing — see pricing.ts
    salePct,
    origPrice,
  };
}

export { priceLimit };
