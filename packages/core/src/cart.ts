import { prisma } from "@shoppingmall/db";
import type { ShopConfig } from "./config";
import { type EventDiscountMap, type PriceLimitConfig, getGoodsPrice } from "./pricing";

// Port of lib/lib.Shop.php:79 getCartId()'s login-time cart merge, inlined
// wherever legacy calls it (login_post.php:78, regist_post.php:179,
// popup_sns_regist_post.php:139) — a guest's cart rows are re-owned to the
// member's cart_id the moment they authenticate.
export async function mergeGuestCartOnLogin(guestCartId: string, memberId: string): Promise<void> {
  const memberCartId = Buffer.from(memberId).toString("base64");
  if (guestCartId === memberCartId) return;
  await prisma.cart.updateMany({ where: { cart_id: guestCartId }, data: { cart_id: memberCartId } });
}

export type AddToCartInput = { goodsUid: number; optionUid: number; qty: number; direct: boolean };
export type AddToCartResult = { ok: true } | { ok: false; error: string };

// Port of php/goods_cart_json.php. Guests can add to cart (legacy allows
// this too — the my_id-only rejection there is specifically for limit_qty
// items, reproduced below via getOrderableLimitQty).
export async function addToCart(
  cartId: string,
  memberId: string | null,
  input: AddToCartInput,
): Promise<AddToCartResult> {
  const goods = await prisma.goods.findFirst({ where: { uid: input.goodsUid } });
  if (!goods || goods.sale_use === 0) return { ok: false, error: "판매 중지된 상품입니다." };
  if (input.qty < 1) return { ok: false, error: "수량을 확인해주세요." };

  let option: Awaited<ReturnType<typeof prisma.goodsOption.findFirst>> = null;
  if (goods.option_use === 1) {
    if (!input.optionUid) return { ok: false, error: "옵션을 선택해주세요." };
    option = await prisma.goodsOption.findFirst({ where: { uid: input.optionUid, guid: goods.uid, used: 1 } });
    if (!option) return { ok: false, error: "선택하신 옵션을 사용할 수 없습니다." };
  }

  const existing = await prisma.cart.findFirst({
    where: { cart_id: cartId, g_uid: input.goodsUid, option: input.optionUid },
  });
  const prevQty = existing?.qty ?? 0;
  const nextQty = prevQty + input.qty;

  if (goods.limit_qty > 0) {
    if (!memberId) return { ok: false, error: "회원만 구매 가능한 상품입니다." };
    const remaining = await getOrderableLimitQty(memberId, goods.uid, cartId, goods.limit_qty);
    if (input.qty > remaining) {
      return { ok: false, error: `회원당 ${goods.limit_qty}개까지 구매 가능합니다.` };
    }
  }

  if (option) {
    if (option.qty_type === 0 && option.qty < nextQty) {
      return { ok: false, error: "재고가 부족합니다." };
    }
  } else if (goods.qty_type === 0 && goods.qty < nextQty) {
    return { ok: false, error: "재고가 부족합니다." };
  }

  const vendorDelivery = goods.vendor; // no vendor_configuration table — every vendor handles its own delivery
  if (existing) {
    await prisma.cart.update({
      where: { uid: existing.uid },
      data: { qty: nextQty, selects: 1, direct: input.direct ? 1 : existing.direct },
    });
  } else {
    // direct==1 ("buy now") — legacy clears any other direct=1 row first so
    // only one item is ever in the buy-now scope at a time.
    if (input.direct) {
      await prisma.cart.updateMany({ where: { cart_id: cartId, direct: 1 }, data: { direct: 0 } });
    }
    await prisma.cart.create({
      data: {
        vendor: goods.vendor,
        vendor_delivery: vendorDelivery,
        cart_id: cartId,
        g_uid: input.goodsUid,
        g_cate: goods.cate,
        qty: input.qty,
        option: input.optionUid,
        direct: input.direct ? 1 : 0,
        selects: 1,
        signdate: Math.floor(Date.now() / 1000),
      },
    });
  }

  return { ok: true };
}

// Port of lib/lib.Shop.php:464 getOrderQty(). Sums quantity from
// non-cancelled past orders plus everything currently sitting in the cart
// for this goods (across every option), so the two can't double-count with
// what's about to be added — see getOrderableLimitQty for the full formula.
async function getPastAndCartQty(memberId: string, goodsUid: number, cartId: string): Promise<number> {
  const orders = await prisma.orderInfo.findMany({ where: { id: memberId, reals: 1 }, select: { order_num: true } });
  const orderNums = orders.map((o) => o.order_num);

  const [pastAgg, cartAgg] = await Promise.all([
    orderNums.length
      ? prisma.orderGoods.aggregate({
          _sum: { qty: true },
          where: { order_num: { in: orderNums }, g_uid: goodsUid, NOT: { status: { in: [8, 9] }, status2: 5 } },
        })
      : Promise.resolve({ _sum: { qty: null } }),
    prisma.cart.aggregate({ _sum: { qty: true }, where: { cart_id: cartId, g_uid: goodsUid } }),
  ]);

  return (pastAgg._sum.qty ?? 0) + (cartAgg._sum.qty ?? 0);
}

// Guests can never buy a limit_qty item (legacy rejects them outright —
// there's no order history to check a limit against).
export async function getOrderableLimitQty(
  memberId: string | null,
  goodsUid: number,
  cartId: string,
  limitQty: number,
): Promise<number> {
  if (!memberId) return 0;
  const used = await getPastAndCartQty(memberId, goodsUid, cartId);
  return Math.max(0, limitQty - used);
}

export type CartLine = {
  cartUid: number;
  goodsUid: number;
  goodsName: string;
  goodsCode: string;
  image: string;
  vendor: string;
  vendorDelivery: string;
  optionUid: number;
  optionValue: string | null;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  deliveryType: number;
  deliveryPrice: number;
  selected: boolean;
  direct: boolean;
  soldOut: boolean;
  availableQty: number | null;
  requiresOptionMissing: boolean;
};

// Port of lib/lib.Shop.php:1038 getCartGoodsInfo() — read-only, no side
// effects. Legacy silently clamps/deletes cart rows as a side effect of
// rendering them; this repo separates "what's wrong with this row" (here)
// from "fix it in the DB" (validateAndSyncCart), so a page render never
// mutates data.
async function toCartLine(
  row: NonNullable<Awaited<ReturnType<typeof prisma.cart.findFirst>>>,
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
  memberDiscountPct: number,
): Promise<CartLine | null> {
  const goods = await prisma.goods.findFirst({ where: { uid: row.g_uid } });
  if (!goods) return null;

  let optionValue: string | null = null;
  let optionPriceAdd = 0;
  let availableQty: number | null = null;
  let soldOut = goods.sale_use === 0;
  let requiresOptionMissing = false;

  if (goods.option_use === 1) {
    if (!row.option) {
      requiresOptionMissing = true;
    } else {
      const option = await prisma.goodsOption.findFirst({ where: { uid: row.option, guid: goods.uid } });
      if (!option || option.used !== 1) {
        soldOut = true;
      } else {
        optionValue = option.value;
        optionPriceAdd = option.price;
        if (option.qty_type === 0) {
          availableQty = option.qty;
          if (option.qty < 1) soldOut = true;
        }
      }
    }
  } else if (goods.qty_type === 0) {
    availableQty = goods.qty;
    if (goods.qty < 1) soldOut = true;
  }

  if (goods.vendor) {
    const vendor = await prisma.vendor.findFirst({ where: { id: goods.vendor }, select: { sell: true } });
    if (!vendor || vendor.sell !== "A") soldOut = true;
  }

  const { price: discountedPrice } = getGoodsPrice(
    goods.price,
    goods.exhibition,
    eventDiscounts,
    priceLimitConfig,
    memberDiscountPct,
  );
  const unitPrice = discountedPrice + optionPriceAdd;

  return {
    cartUid: row.uid,
    goodsUid: goods.uid,
    goodsName: goods.name,
    goodsCode: goods.goods_code,
    image: goods.image2 ? `/image/goods/${goods.image2}` : "/image/no_image.png",
    vendor: row.vendor,
    vendorDelivery: row.vendor_delivery,
    optionUid: row.option,
    optionValue,
    qty: row.qty,
    unitPrice,
    lineTotal: unitPrice * row.qty,
    deliveryType: goods.delivery_type,
    deliveryPrice: goods.delivery_price,
    selected: row.selects === 1,
    direct: row.direct === 1,
    soldOut,
    availableQty,
    requiresOptionMissing,
  };
}

// Port of php/cart.php's listing — every row for this cart_id, regardless of
// selects/direct, for the cart page itself.
export async function getCart(
  cartId: string,
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
  memberDiscountPct: number,
): Promise<CartLine[]> {
  const rows = await prisma.cart.findMany({ where: { cart_id: cartId }, orderBy: { uid: "desc" } });
  const lines = await Promise.all(rows.map((row) => toCartLine(row, eventDiscounts, priceLimitConfig, memberDiscountPct)));
  return lines.filter((l): l is CartLine => l !== null);
}

async function getCheckoutScopeLines(
  cartId: string,
  direct: boolean,
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
  memberDiscountPct: number,
): Promise<CartLine[]> {
  const rows = await prisma.cart.findMany({
    where: direct ? { cart_id: cartId, direct: 1 } : { cart_id: cartId, selects: 1 },
  });
  const lines = await Promise.all(rows.map((row) => toCartLine(row, eventDiscounts, priceLimitConfig, memberDiscountPct)));
  return lines.filter((l): l is CartLine => l !== null);
}

export type ValidateCartResult = {
  ok: boolean; // false when the checkout scope ended up empty
  removed: string[]; // goods names dropped from the checkout scope (sold out / vendor stopped selling / missing option)
  adjusted: string[]; // goods names whose qty was clamped down to available stock
};

// Port of lib/lib.Shop.php:1224 checkCartOrder(). Call this right before
// showing /order and again inside createOrder's transaction — it's the
// gate that keeps a stale cart (stock sold out since it was added, vendor
// stopped selling, etc.) from turning into an order.
export async function validateAndSyncCart(cartId: string, direct: boolean): Promise<ValidateCartResult> {
  const rows = await prisma.cart.findMany({
    where: direct ? { cart_id: cartId, direct: 1 } : { cart_id: cartId, selects: 1 },
  });

  const removed: string[] = [];
  const adjusted: string[] = [];

  for (const row of rows) {
    const goods = await prisma.goods.findFirst({ where: { uid: row.g_uid } });
    if (!goods) {
      await prisma.cart.delete({ where: { uid: row.uid } });
      continue;
    }

    let mustRemove = goods.sale_use === 0;
    let clampTo: number | null = null;

    if (goods.vendor && !mustRemove) {
      const vendor = await prisma.vendor.findFirst({ where: { id: goods.vendor }, select: { sell: true } });
      if (!vendor || vendor.sell !== "A") mustRemove = true;
    }

    if (!mustRemove && goods.option_use === 1) {
      if (!row.option) {
        mustRemove = true;
      } else {
        const option = await prisma.goodsOption.findFirst({ where: { uid: row.option, guid: goods.uid } });
        if (!option || option.used !== 1) mustRemove = true;
        else if (option.qty_type === 0) {
          if (option.qty < 1) mustRemove = true;
          else if (option.qty < row.qty) clampTo = option.qty;
        }
      }
    } else if (!mustRemove && goods.qty_type === 0) {
      if (goods.qty < 1) mustRemove = true;
      else if (goods.qty < row.qty) clampTo = goods.qty;
    }

    if (mustRemove) {
      await prisma.cart.update({ where: { uid: row.uid }, data: { selects: 0, direct: 0 } });
      removed.push(goods.name);
    } else if (clampTo !== null) {
      await prisma.cart.update({ where: { uid: row.uid }, data: { qty: clampTo } });
      adjusted.push(goods.name);
    }
  }

  const remaining = await prisma.cart.count({
    where: direct ? { cart_id: cartId, direct: 1 } : { cart_id: cartId, selects: 1 },
  });

  return { ok: remaining > 0, removed, adjusted };
}

export type DeliveryConfig = Pick<
  ShopConfig,
  "deliveryType" | "deliveryDPrice" | "deliveryPType" | "deliveryPPrice1" | "deliveryPPrice2"
>;

// Port of order_post.php:40-150's delivery-fee grouping, simplified to
// Configuration's shop-wide policy — this repo has no
// mallRN_vendor_configuration/mallRN_delivery_configuration tables to source
// per-vendor or per-region overrides from (see MIGRATION.md Phase 4 scope).
export function getDeliveryFee(
  items: Pick<CartLine, "vendorDelivery" | "deliveryType" | "deliveryPrice" | "lineTotal">[],
  config: DeliveryConfig,
): { total: number; perVendor: Map<string, number> } {
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const group = groups.get(item.vendorDelivery) ?? [];
    group.push(item);
    groups.set(item.vendorDelivery, group);
  }

  const perVendor = new Map<string, number>();
  for (const [vendor, lines] of groups) {
    let fee = 0;
    let fixedCharged = false;
    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    let usesDefault = false;

    for (const line of lines) {
      switch (line.deliveryType) {
        case 2: // free
          break;
        case 3: // COD — collected on delivery, not part of the prepaid total
          break;
        case 4: // fixed per vendor group — only the first item carries it
          if (!fixedCharged) {
            fee += line.deliveryPrice;
            fixedCharged = true;
          }
          break;
        case 5: // per item
          fee += line.deliveryPrice;
          break;
        default:
          usesDefault = true;
      }
    }

    if (usesDefault) {
      if (config.deliveryType === "D") fee += config.deliveryDPrice;
      else if (config.deliveryType !== "F" && subtotal < config.deliveryPPrice1) fee += config.deliveryPPrice2;
    }

    perVendor.set(vendor, fee);
  }

  const total = Array.from(perVendor.values()).reduce((a, b) => a + b, 0);
  return { total, perVendor };
}

export type CartSummary = {
  lines: CartLine[];
  subtotal: number;
  deliveryTotal: number;
  perVendorDelivery: Map<string, number>;
};

// Port of order.php:1-150 / order_post.php:39-172's amount calculation
// (pre coupon/mileage). Read-only.
export async function getCartSummary(
  cartId: string,
  direct: boolean,
  config: ShopConfig,
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
  memberDiscountPct: number,
): Promise<CartSummary> {
  const lines = await getCheckoutScopeLines(cartId, direct, eventDiscounts, priceLimitConfig, memberDiscountPct);
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const { total: deliveryTotal, perVendor: perVendorDelivery } = getDeliveryFee(lines, config);
  return { lines, subtotal, deliveryTotal, perVendorDelivery };
}

export async function updateCartQty(cartId: string, cartUid: number, qty: number): Promise<void> {
  if (qty < 1) {
    await prisma.cart.deleteMany({ where: { uid: cartUid, cart_id: cartId } });
    return;
  }
  await prisma.cart.updateMany({ where: { uid: cartUid, cart_id: cartId }, data: { qty } });
}

export async function removeCartItem(cartId: string, cartUid: number): Promise<void> {
  await prisma.cart.deleteMany({ where: { uid: cartUid, cart_id: cartId } });
}

export async function toggleCartSelect(cartId: string, cartUid: number, selected: boolean): Promise<void> {
  await prisma.cart.updateMany({ where: { uid: cartUid, cart_id: cartId }, data: { selects: selected ? 1 : 0 } });
}

export async function getCartCount(cartId: string): Promise<number> {
  return prisma.cart.count({ where: { cart_id: cartId } });
}
