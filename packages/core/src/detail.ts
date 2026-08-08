import { prisma } from "@shoppingmall/db";
import type { ShopConfig } from "./config";
import { type GoodsCardViewModel, toGoodsCard } from "./goods";
import { getGoodsPrice, priceLimit } from "./pricing";
import { getActiveEventDiscounts, priceLimitConfigFrom } from "./listing";
import { getOrderableLimitQty } from "./cart";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export type OptionValue = { uid: number; value: string; priceLabel: string | null };
export type OptionGroup = { name: string; values: OptionValue[] };
// One row per GoodsOption combination — exposed alongside OptionGroup so a
// multi-dimension picker can resolve a per-dimension selection (e.g.
// ["화이트", "S"]) to the actual combination row's uid/price/stock. For a
// single-dimension product this stays empty; OptionGroup's own per-value
// uid already resolves directly (see getGoodsDetail below).
export type OptionCombination = { uid: number; parts: string[]; price: number; priceLabel: string | null; soldOut: boolean };

export type GoodsDetailViewModel = {
  uid: number;
  name: string;
  nameCodeAble: string;
  icons: string[];
  images: string[];
  price: string;
  origPrice: string | null;
  saleMsg: string | null;
  consumerPrice: string | null;
  goodsCode: string;
  model: string;
  make: string;
  origin: string;
  brand: string;
  makingInfo: { name: string; value: string }[];
  requireInfo: { name: string; value: string }[];
  mileagePct: number;
  deliveryMessage: string;
  limitQty: number;
  detailHtml: string;
  soldOut: boolean;
  purchaseBlocked: boolean;
  limitMsg: string | null;
  optionUse: boolean;
  options: OptionGroup[];
  optionCombinations: OptionCombination[];
  relatedGoods: GoodsCardViewModel[];
  reviewCount: number;
  inquiryCount: number;
  deliveryInfo: string;
  refundInfo: string;
  exchangeInfo: string;
  asInfo: string;
  vendor: string;
  vendorName: string | null;
  vendorGoods: GoodsCardViewModel[];
};

// Port of lib.Shop.php's delivery message switch used by php/view.php:266-286.
function getDeliveryMessage(
  deliveryType: number,
  deliveryPrice: number,
  config: Pick<ShopConfig, "deliveryType" | "deliveryDPrice" | "deliveryPType" | "deliveryPPrice1" | "deliveryPPrice2">,
): string {
  switch (deliveryType) {
    case 1:
      if (config.deliveryType === "F") return "무료배송";
      if (config.deliveryType === "D") return `착불 (${formatWon(config.deliveryDPrice)}원)`;
      return `${formatWon(config.deliveryPPrice2)}원 (주문금액 ${formatWon(config.deliveryPPrice1)}원 이상 구매시 무료)`;
    case 2:
      return "무료배송";
    case 3:
      return "착불";
    case 4:
      return `${formatWon(deliveryPrice)}원`;
    case 5:
      return `${formatWon(deliveryPrice)}원(개당)`;
    default:
      return "";
  }
}

// Port of php/view.php. Cart mutation (add-to-cart / buy-now) and reviews
// are still out of scope — see the migration plan (cart needs Phase 4;
// reviews need mallRN_review, which itself needs an order to point at via
// og_uid). Product inquiries, member-level pricing, and the vendor's
// popular-products panel are now wired up.
export async function getGoodsDetail(
  uid: number,
  config: ShopConfig,
  memberDiscountPct = 0,
  purchaser: { memberId: string | null; cartId: string } | null = null,
): Promise<GoodsDetailViewModel | null> {
  const row = await prisma.goods.findFirst({ where: { uid, display_use: 1 } });
  if (!row) return null;

  // Port of view.php:155-167's information_use switch — 1 means "use my
  // vendor's reusable default guide text" (mallRN_vendor_configuration,
  // set up on /vendor/store), anything else means this product wrote its
  // own delivery/refund/exchange/AS text. A 직영(vendor="") product with the
  // flag on has no VendorConfiguration to borrow from, so it falls back to
  // Configuration's shop-wide equivalent (settings/goods, H6) instead — this
  // fallback was missing entirely until H6 (config.ts's getShopConfig
  // hadn't read those 4 columns at all before then).
  const vendorConfig =
    row.information_use === 1 && row.vendor
      ? await prisma.vendorConfiguration.findFirst({ where: { vendor: row.vendor } })
      : null;
  const useShopWideInfo = row.information_use === 1 && !row.vendor;

  const eventDiscounts = await getActiveEventDiscounts();
  const priceLimitConfig = priceLimitConfigFrom(config);

  const images = [row.image1, ...row.other_image.split(",")].filter(Boolean).map((f) => `/image/goods/${f}`);
  if (images.length === 0) images.push("/image/no_image.png");

  let price: string;
  let origPrice: string | null = null;
  let saleMsg: string | null = null;

  if (row.price_ment) {
    price = row.price_ment;
  } else {
    const { price: discounted, eventDiscountPct } = getGoodsPrice(
      row.price,
      row.exhibition,
      eventDiscounts,
      priceLimitConfig,
      memberDiscountPct,
    );
    price = formatWon(discounted);
    if (eventDiscountPct > 0 || memberDiscountPct > 0) {
      origPrice = formatWon(row.price);
      // Port of php/view.php:119-131's $sale_msg_array join order: member
      // discount first, then event discount.
      const saleMsgParts: string[] = [];
      if (memberDiscountPct > 0) saleMsgParts.push(`회원등급할인 ${memberDiscountPct}%`);
      if (eventDiscountPct > 0) saleMsgParts.push(`이벤트할인 ${eventDiscountPct}%`);
      saleMsg = saleMsgParts.join(", ");
    }
  }

  let soldOut = false;
  if (row.sale_use === 0) soldOut = true;
  else if (row.option_use === 1) {
    const [used, soldOutOptions] = await Promise.all([
      prisma.goodsOption.count({ where: { guid: uid, used: 1 } }),
      prisma.goodsOption.count({ where: { guid: uid, used: 1, qty_type: 0, qty: { lt: 1 } } }),
    ]);
    if (used - soldOutOptions === 0) soldOut = true;
  } else if (row.qty_type === 0 && row.qty < 1) soldOut = true;

  let purchaseBlocked = false;
  let limitMsg: string | null = null;
  if (row.limit_qty > 0) {
    if (!purchaser?.memberId) {
      purchaseBlocked = true;
      limitMsg = "회원만 구매 가능 합니다.";
    } else {
      const remaining = await getOrderableLimitQty(purchaser.memberId, uid, purchaser.cartId, row.limit_qty);
      if (remaining <= 0) {
        purchaseBlocked = true;
        limitMsg = "회원당 구매 가능 수량을 모두 구매했습니다.";
      }
    }
  }

  const options: OptionGroup[] = [];
  let optionCombinations: OptionCombination[] = [];
  if (row.option_use === 1 && row.option_info) {
    const dimensions = row.option_info.split("|*|").map((d) => d.split("|")[0]).filter(Boolean);
    if (dimensions.length === 1) {
      const valueRows = await prisma.goodsOption.findMany({
        where: { guid: uid, used: 1 },
        orderBy: { sequence: "asc" },
      });
      const seen = new Set<string>();
      const values: OptionValue[] = [];
      for (const v of valueRows) {
        if (seen.has(v.value)) continue;
        seen.add(v.value);
        values.push({
          uid: v.uid,
          value: v.value,
          priceLabel: v.price > 0 ? `(+${formatWon(v.price)}원)` : v.price < 0 ? `(${formatWon(v.price)}원)` : null,
        });
      }
      options.push({ name: dimensions[0], values });
    } else {
      // Port of goods_option_info_json.php's combination rows — GoodsOption.value
      // is already "화이트|S"-style pipe-joined per dimension (see
      // generateOptionCombinations in goods-admin.ts), so no schema/cart.ts
      // change is needed: just expose every row and let the picker resolve
      // a dimension selection to the matching combination's uid/price/stock.
      const comboRows = await prisma.goodsOption.findMany({
        where: { guid: uid, used: 1 },
        orderBy: { sequence: "asc" },
      });
      optionCombinations = comboRows.map((r) => ({
        uid: r.uid,
        parts: r.value.split("|"),
        price: r.price,
        priceLabel: r.price > 0 ? `(+${formatWon(r.price)}원)` : r.price < 0 ? `(${formatWon(r.price)}원)` : null,
        soldOut: r.qty_type === 0 && r.qty <= 0,
      }));
      dimensions.forEach((name, i) => {
        const seen = new Set<string>();
        const values: OptionValue[] = [];
        for (const combo of optionCombinations) {
          const v = combo.parts[i];
          if (v === undefined || seen.has(v)) continue;
          seen.add(v);
          values.push({ uid: 0, value: v, priceLabel: null });
        }
        options.push({ name, values });
      });
    }
  }

  const makingInfo = row.making_info
    ? row.making_info
        .split("|*|")
        .map((v) => v.split("|"))
        .filter((p) => p[0])
        .map(([name, value]) => ({ name, value }))
    : [];

  const requireInfo = row.require_info
    ? row.require_info
        .split("|*|")
        .map((v) => v.split("|"))
        .filter((p) => p[0])
        .map(([name, value]) => ({ name, value }))
    : [];

  let mileagePct = 0;
  if (purchaser?.memberId) {
    if (row.mileage_type === 1) {
      const [memberConfig, member] = await Promise.all([
        prisma.configuration.findUnique({ where: { uid: 2 }, select: { member_mileage_yn: true, member_mileage_order: true } }),
        prisma.member.findUnique({ where: { id: purchaser.memberId }, select: { level: true } }),
      ]);
      if (memberConfig?.member_mileage_yn === "Y" && member) {
        const level = await prisma.memberLevel.findFirst({ where: { level: member.level }, select: { mileage: true } });
        mileagePct = memberConfig.member_mileage_order + (level?.mileage ?? 0);
      }
    } else if (row.mileage_type === 3) {
      const member = await prisma.member.findUnique({ where: { id: purchaser.memberId }, select: { level: true } });
      const match = row.mileage_level.split("|*|").map((value) => value.split("|")).find(([level]) => Number(level) === member?.level);
      mileagePct = Number(match?.[1] ?? 0) || 0;
    } else if (row.mileage_type === 4) mileagePct = row.mileage_common;
  }

  const deliveryMessage = getDeliveryMessage(row.delivery_type, row.delivery_price, config);

  const relatedRows = await prisma.goods.findMany({
    where: { display_use: 1, auth_ck: "Y", cate_hide: 0, vendor_hide: 0, cate: row.cate, uid: { not: uid } },
    orderBy: { order_cnt: "desc" },
    take: 6,
  });

  const reviewCount = await prisma.review.count({ where: { g_uid: uid } });
  const inquiryCount = await prisma.inquiry.count({ where: { g_uid: uid } });

  // Port of php/view.php:468-488's "이 판매자의 인기상품" widget: seller-curated
  // display slots first, order count as tiebreaker, excluding this product.
  let vendorName: string | null = null;
  let vendorGoods: GoodsCardViewModel[] = [];
  if (row.vendor) {
    const vendor = await prisma.vendor.findFirst({ where: { id: row.vendor }, select: { comp_name: true } });
    vendorName = vendor?.comp_name ?? null;

    const vendorRows = await prisma.goods.findMany({
      where: { display_use: 1, auth_ck: "Y", cate_hide: 0, vendor_hide: 0, vendor: row.vendor, uid: { not: uid } },
      orderBy: [
        { store_display1: "desc" },
        { store_display2: "desc" },
        { store_display3: "desc" },
        { order_cnt: "desc" },
      ],
      take: 6,
    });
    vendorGoods = vendorRows.map((r) => toGoodsCard(r, eventDiscounts, priceLimitConfig, memberDiscountPct));
  }

  return {
    uid: row.uid,
    name: row.name,
    nameCodeAble: row.name_code_able,
    icons: row.icon ? row.icon.split("|").filter(Boolean) : [],
    images,
    price,
    origPrice,
    saleMsg,
    consumerPrice: row.consumer_price > 0 ? formatWon(row.consumer_price) : null,
    goodsCode: row.goods_code,
    model: row.model,
    make: row.make,
    origin: row.origin,
    brand: row.brand,
    makingInfo,
    requireInfo,
    mileagePct,
    deliveryMessage,
    limitQty: row.limit_qty,
    detailHtml: row.explains,
    soldOut,
    purchaseBlocked,
    limitMsg,
    optionUse: row.option_use === 1,
    options,
    optionCombinations,
    relatedGoods: relatedRows.map((r) => toGoodsCard(r, eventDiscounts, priceLimitConfig, memberDiscountPct)),
    reviewCount,
    inquiryCount,
    deliveryInfo: vendorConfig ? vendorConfig.goods_delivery_info : useShopWideInfo ? config.goodsDeliveryInfo : row.delivery_info,
    refundInfo: vendorConfig ? vendorConfig.goods_refund_info : useShopWideInfo ? config.goodsRefundInfo : row.refund_info,
    exchangeInfo: vendorConfig ? vendorConfig.goods_exchange_info : useShopWideInfo ? config.goodsExchangeInfo : row.exchange_info,
    vendor: row.vendor,
    vendorName,
    vendorGoods,
    asInfo: vendorConfig ? vendorConfig.goods_as_info : useShopWideInfo ? config.goodsAsInfo : row.as_info,
  };
}

export { priceLimit };
