import { type Prisma, prisma } from "@shoppingmall/db";
import { verifyPassword } from "@shoppingmall/auth";
import type { ShopConfig } from "./config";
import type { EventDiscountMap, PriceLimitConfig } from "./pricing";
import { getCartSummary, validateAndSyncCart } from "./cart";
import { consumeCoupon, getCouponPrice, restoreCoupon } from "./coupon";
import { type MileageValidityConfig, getMileageBalance, saveMileage, useMileage } from "./mileage";
import type { Device } from "./device";

type Tx = Prisma.TransactionClient;

function now(): number {
  return Math.floor(Date.now() / 1000);
}

// Port of order_list.php / order_detail.php's status_array.
const STATUS_LABELS: Record<number, string> = {
  0: "입금대기중",
  1: "결제완료",
  2: "배송준비중",
  3: "배송중",
  4: "배송완료",
  7: "교환",
  8: "반품",
  9: "취소",
};

function generateOrderNum(insertedUid: number): string {
  const d = new Date();
  const yy = String(d.getFullYear() % 100).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const HH = String(d.getHours()).padStart(2, "0");
  const MM = String(d.getMinutes()).padStart(2, "0");
  const tail = String(insertedUid).padStart(5, "0").slice(-5);
  return `${yy}${mm}${dd}-${HH}${MM}_${tail}`;
}

function calcLineMileagePct(goods: { mileage_type: number; mileage_common: number }, memberLevelMileagePct: number): number {
  if (goods.mileage_type === 3) return memberLevelMileagePct;
  if (goods.mileage_type === 4) return goods.mileage_common;
  return 0; // type 1 (per-member override) needs member_mileage_order config — not implemented, see detail.ts
}

export type CreateOrderInput = {
  cartId: string;
  memberId: string | null;
  direct: boolean;
  device: Device;
  name: string;
  cell: string;
  email: string;
  name2: string;
  cell2: string;
  postcode: string;
  address1: string;
  address2: string;
  message: string;
  guestPasswordHash?: string; // pre-hashed (argon2id) — see actions.ts
  payType: "B" | "M";
  couponUid: number | null; // mallRN_coupon.uid (an issued instance), cart-level (g_uid=0)
  useMileage: number;
  clientPayTotal: number;
  config: ShopConfig & MileageValidityConfig;
  eventDiscounts: EventDiscountMap;
  priceLimitConfig: PriceLimitConfig;
  memberDiscountPct: number;
};

export type CreateOrderResult = { ok: true; orderNum: string } | { ok: false; error: string };

// Port of php/order_post.php. No real DB transaction exists in the legacy
// version of this flow (see MIGRATION.md's Phase 4 plan) — everything below
// runs inside prisma.$transaction so a failure at any step (oversold stock,
// a race on the same coupon) rolls back the whole order instead of leaving
// a half-written mallRN_order_info/mallRN_order_goods/stock/mileage state.
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const sync = await validateAndSyncCart(input.cartId, input.direct);
  if (!sync.ok) return { ok: false, error: "주문 가능한 상품이 없습니다." };
  if (sync.removed.length > 0 || sync.adjusted.length > 0) {
    return { ok: false, error: "장바구니 상품 정보가 변경되었습니다. 다시 확인해주세요." };
  }

  const summary = await getCartSummary(
    input.cartId,
    input.direct,
    input.config,
    input.eventDiscounts,
    input.priceLimitConfig,
    input.memberDiscountPct,
  );
  if (summary.lines.length === 0) return { ok: false, error: "주문 가능한 상품이 없습니다." };
  if (summary.lines.some((l) => l.soldOut || l.requiresOptionMissing)) {
    return { ok: false, error: "품절되었거나 옵션이 필요한 상품이 있습니다. 장바구니를 다시 확인해주세요." };
  }

  if (input.payType === "M" && !input.memberId) {
    return { ok: false, error: "마일리지 결제는 회원만 가능합니다." };
  }

  let couponDiscount = 0;
  if (input.couponUid) {
    if (!input.memberId) return { ok: false, error: "쿠폰은 회원만 사용할 수 있습니다." };
    const coupon = await prisma.coupon.findFirst({
      where: { uid: input.couponUid, id: input.memberId, g_uid: 0, status: 0, e_date: { gt: new Date() } },
    });
    if (!coupon) return { ok: false, error: "사용할 수 없는 쿠폰입니다." };
    couponDiscount = await getCouponPrice(summary.subtotal, coupon.c_uid);
  }

  if (input.useMileage > 0) {
    if (!input.memberId) return { ok: false, error: "마일리지는 회원만 사용할 수 있습니다." };
    const balance = await getMileageBalance(input.memberId);
    if (input.useMileage > balance) return { ok: false, error: "보유 마일리지가 부족합니다." };
  }

  const grandTotal = summary.subtotal + summary.deliveryTotal - couponDiscount - input.useMileage;
  if (grandTotal < 0) return { ok: false, error: "마일리지/쿠폰 사용액이 결제금액을 초과합니다." };
  if (grandTotal !== input.clientPayTotal) {
    return { ok: false, error: "결제금액이 일치하지 않습니다. 다시 시도해주세요." };
  }

  const goodsUids = Array.from(new Set(summary.lines.map((l) => l.goodsUid)));

  try {
    const orderNum = await prisma.$transaction(async (tx) => {
      const goodsRows = await tx.goods.findMany({ where: { uid: { in: goodsUids } } });
      const goodsByUid = new Map(goodsRows.map((g) => [g.uid, g]));

      let memberLevelMileagePct = 0;
      if (input.memberId) {
        const member = await tx.member.findFirst({ where: { id: input.memberId }, select: { level: true } });
        if (member) {
          const level = await tx.memberLevel.findFirst({ where: { level: member.level }, select: { mileage: true } });
          memberLevelMileagePct = level?.mileage ?? 0;
        }
      }

      // order_num is varchar(32) — a full UUID doesn't fit, so this trims to
      // a 28-char hex token. It only needs to be unique for the instant
      // between insert and the real order_num update just below.
      const draftOrderNum = `tmp${crypto.randomUUID().replace(/-/g, "").slice(0, 28)}`;
      const created = await tx.orderInfo.create({
        data: {
          id: input.memberId ?? "",
          order_num: draftOrderNum,
          name: input.name,
          cell: input.cell,
          email: input.email,
          name2: input.name2,
          cell2: input.cell2,
          postcode: input.postcode,
          address1: input.address1,
          address2: input.address2,
          message: input.message,
          passwd: input.guestPasswordHash ?? "",
          pay_total: grandTotal,
          delivery_total: summary.deliveryTotal,
          pay_type: input.payType,
          pay_status: "A",
          use_mileage: input.useMileage,
          use_coupon: couponDiscount,
          coupon_uid: input.couponUid ?? 0,
          mobile: input.device === "mobile" ? "Y" : "N",
          direct: input.direct ? 1 : 0,
          new: 1,
          reals: 1,
          signdate: now(),
        },
      });

      const orderNum = generateOrderNum(created.uid);
      await tx.orderInfo.update({ where: { uid: created.uid }, data: { order_num: orderNum } });

      for (const line of summary.lines) {
        const goods = goodsByUid.get(line.goodsUid);
        const mileagePct = goods ? calcLineMileagePct(goods, memberLevelMileagePct) : 0;
        await tx.orderGoods.create({
          data: {
            vendor: line.vendor,
            vendor_delivery: line.vendorDelivery,
            order_num: orderNum,
            g_uid: line.goodsUid,
            g_cate: goods?.cate ?? BigInt(0),
            g_name: line.goodsName,
            g_code: line.goodsCode,
            price: line.unitPrice,
            orig_price: goods?.orig_price ?? 0,
            qty: line.qty,
            mileage: Math.floor((line.lineTotal * mileagePct) / 100),
            option: line.optionUid,
            option_name: line.optionValue ?? "",
            delivery_type: line.deliveryType,
            delivery_price: line.deliveryPrice,
            status: 0,
            status2: 0,
            reals: 1,
            signdate: now(),
          },
        });

        // Port of lib.Shop.php:1345 goodsOrderQtyChange() — decrement stock
        // for finite-stock items now (B/M both commit stock immediately,
        // same as legacy), with a conditional WHERE so a concurrent order
        // can't oversell the same last unit. This repo enforces the check
        // atomically inside the transaction; legacy has no such guard.
        if (line.availableQty !== null) {
          const affected = line.optionUid
            ? await tx.goodsOption.updateMany({
                where: { uid: line.optionUid, qty: { gte: line.qty } },
                data: { qty: { decrement: line.qty } },
              })
            : await tx.goods.updateMany({
                where: { uid: line.goodsUid, qty: { gte: line.qty } },
                data: { qty: { decrement: line.qty } },
              });
          if (affected.count === 0) throw new Error("OUT_OF_STOCK");

          if (line.optionUid) {
            const remaining = await tx.goodsOption.count({ where: { guid: line.goodsUid, used: 1, qty_type: 0, qty: { gt: 0 } } });
            if (remaining === 0) await tx.goods.updateMany({ where: { uid: line.goodsUid }, data: { option_soldout: 2 } });
          }
        }
        await tx.goods.updateMany({ where: { uid: line.goodsUid }, data: { order_cnt: { increment: line.qty } } });
      }

      for (const [vendor, price] of summary.perVendorDelivery) {
        await tx.orderDelivery.create({ data: { order_num: orderNum, vendor, price, signdate: now() } });
      }

      if (input.couponUid) await consumeCoupon(input.couponUid, tx);
      if (input.useMileage > 0 && input.memberId) {
        await useMileage(input.memberId, input.useMileage, "상품구입 마일리지 사용", orderNum, tx);
      }

      if (input.payType === "M" && grandTotal === 0) {
        await orderStatus1(orderNum, input.memberId ?? "guest", tx);
      }

      const orderedCartUids = summary.lines.map((l) => l.cartUid);
      await tx.cart.deleteMany({ where: { uid: { in: orderedCartUids }, cart_id: input.cartId } });

      return orderNum;
    });

    return { ok: true, orderNum };
  } catch (err) {
    if (err instanceof Error && err.message === "OUT_OF_STOCK") {
      return { ok: false, error: "재고가 부족합니다. 다시 시도해주세요." };
    }
    throw err;
  }
}

// Port of lib.Shop.php:1462 orderStatus1() (payment confirmed), trimmed of
// the revenue-ledger/PG-commission/cash-receipt side effects that need
// mallRN_order_sales — not added in Phase 4 (admin reporting only, see
// MIGRATION.md). B (무통장입금) orders never reach this in Phase 4 — see
// MIGRATION.md's "나중에 확인할 사항" for why and when that changes.
export async function orderStatus1(orderNum: string, actorId: string, db: Tx | typeof prisma = prisma): Promise<void> {
  const lines = await db.orderGoods.findMany({ where: { order_num: orderNum, status: 0 } });
  for (const line of lines) {
    await db.orderGoods.update({ where: { uid: line.uid }, data: { status: 1, status_date: now() } });
    await db.orderLog.create({
      data: {
        order_num: orderNum,
        og_uid: line.uid,
        id: actorId,
        prev_status: 0,
        status: 1,
        signdate: now(),
      },
    });
  }
  await db.orderInfo.update({ where: { order_num: orderNum }, data: { sales_issued: 1, pay_status: "C", status_date: now() } });
}

async function loadMileageValidityConfig(db: Tx | typeof prisma): Promise<MileageValidityConfig> {
  const row = await db.configuration.findFirstOrThrow({ where: { uid: 1 } });
  return {
    memberMileageValidityYn: row.member_mileage_validity_yn,
    memberMileageValidity: row.member_mileage_validity,
    memberMileageValidityType: row.member_mileage_validity_type,
  };
}

// Port of lib.Shop.php:1389 goodsOrderQtyCancel() — restores stock only for
// finite-stock items (qty_type==0), checked fresh at cancel time same as
// legacy, and refreshes the option_soldout aggregate flag.
async function restoreStock(tx: Tx, line: { g_uid: number; option: number; qty: number }): Promise<void> {
  if (line.option) {
    const option = await tx.goodsOption.findFirst({ where: { uid: line.option } });
    if (option && option.qty_type === 0) {
      await tx.goodsOption.update({ where: { uid: line.option }, data: { qty: { increment: line.qty } } });
    }
  } else {
    const goods = await tx.goods.findFirst({ where: { uid: line.g_uid } });
    if (goods && goods.qty_type === 0) {
      await tx.goods.update({ where: { uid: line.g_uid }, data: { qty: { increment: line.qty } } });
    }
  }
  await tx.goods.updateMany({
    where: { uid: line.g_uid, order_cnt: { gte: line.qty } },
    data: { order_cnt: { decrement: line.qty } },
  });

  const goods = await tx.goods.findFirst({ where: { uid: line.g_uid } });
  if (goods && goods.option_use === 1) {
    const remaining = await tx.goodsOption.count({ where: { guid: line.g_uid, used: 1, qty_type: 0, qty: { gt: 0 } } });
    if (remaining > 0) await tx.goods.updateMany({ where: { uid: line.g_uid }, data: { option_soldout: 0 } });
  }
}

export type CancelResult = { ok: true } | { ok: false; error: string };

// Port of lib.Shop.php:1867 orderStatus9() — cancel while still unpaid.
export async function orderStatus9(orderNum: string, actorId: string): Promise<CancelResult> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.orderInfo.findFirst({ where: { order_num: orderNum } });
    if (!order) return { ok: false, error: "존재하지 않는 주문입니다." };
    if (order.pay_status === "C") return { ok: false, error: "이미 결제완료된 주문입니다." };

    const lines = await tx.orderGoods.findMany({ where: { order_num: orderNum, status: 0 } });
    for (const line of lines) {
      await tx.orderGoods.update({ where: { uid: line.uid }, data: { status: 9, status2: 5, status_date: now() } });
      await tx.orderLog.create({
        data: { order_num: orderNum, og_uid: line.uid, id: actorId, prev_status: 0, status: 9, status2: 5, signdate: now() },
      });
      await restoreStock(tx, line);
    }

    if (order.coupon_uid > 0) await restoreCoupon(order.coupon_uid, tx);
    if (order.use_mileage > 0) {
      const config = await loadMileageValidityConfig(tx);
      await saveMileage(order.id, order.use_mileage, "주문취소에 따른 마일리지 사용 환원", config, orderNum, "", tx);
    }

    await tx.orderInfo.update({
      where: { order_num: orderNum },
      data: { cancel_total: order.pay_total, use_mileage: 0, use_coupon: 0 },
    });

    return { ok: true };
  });
}

// Port of lib.Shop.php:1931 orderStatus95() — cancel after payment
// completed. Legacy expects the caller to have already flipped every line's
// status to 9 before invoking this; here the status flip and the
// restore/reconcile logic happen together in one atomic step. In Phase 4
// the only orders that can ever reach pay_status "C" are mileage-only (M,
// total 0) — see MIGRATION.md's "나중에 확인할 사항".
export async function orderStatus95(orderNum: string, actorId: string): Promise<CancelResult> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.orderInfo.findFirst({ where: { order_num: orderNum } });
    if (!order) return { ok: false, error: "존재하지 않는 주문입니다." };
    if (order.pay_status !== "C") return { ok: false, error: "결제완료된 주문만 취소할 수 있습니다." };

    const lines = await tx.orderGoods.findMany({ where: { order_num: orderNum, status: { not: 9 } } });
    for (const line of lines) {
      await tx.orderGoods.update({ where: { uid: line.uid }, data: { status: 9, status2: 5, status_date: now() } });
      await tx.orderLog.create({
        data: { order_num: orderNum, og_uid: line.uid, id: actorId, prev_status: line.status, status: 9, status2: 5, signdate: now() },
      });
      await restoreStock(tx, line);
    }

    if (order.coupon_uid > 0) await restoreCoupon(order.coupon_uid, tx);
    if (order.use_mileage > 0) {
      const config = await loadMileageValidityConfig(tx);
      await saveMileage(order.id, order.use_mileage, "주문취소에 따른 마일리지 사용 환원", config, orderNum, "", tx);
    }

    const restoredPayTotal = order.pay_total + order.use_mileage + order.use_coupon;
    await tx.orderInfo.update({
      where: { order_num: orderNum },
      data: { pay_total: restoredPayTotal, refund_total: restoredPayTotal, use_mileage: 0, use_coupon: 0 },
    });

    return { ok: true };
  });
}

export type CancelOrderAuth = { memberId: string } | { guestName: string; guestPasswordPlain: string };

// Port of order_status_post.php's status9/status95 dispatch — picks the
// right transition based on whether the order was ever actually paid.
export async function cancelOrder(orderNum: string, auth: CancelOrderAuth): Promise<CancelResult> {
  const order = await prisma.orderInfo.findFirst({ where: { order_num: orderNum } });
  if (!order) return { ok: false, error: "존재하지 않는 주문입니다." };

  let actorId: string;
  if ("memberId" in auth) {
    if (order.id !== auth.memberId) return { ok: false, error: "본인 주문만 취소할 수 있습니다." };
    actorId = auth.memberId;
  } else {
    if (order.id) return { ok: false, error: "본인 주문만 취소할 수 있습니다." };
    const valid = await verifyPassword(order.passwd, auth.guestPasswordPlain);
    if (!valid || order.name.trim().toLowerCase() !== auth.guestName.trim().toLowerCase()) {
      return { ok: false, error: "주문 정보가 일치하지 않습니다." };
    }
    actorId = order.name;
  }

  return order.pay_status === "C" ? orderStatus95(orderNum, actorId) : orderStatus9(orderNum, actorId);
}

export type OrderLineView = {
  ogUid: number;
  goodsUid: number;
  goodsName: string;
  optionValue: string | null;
  qty: number;
  price: number;
  lineTotal: number;
  status: number;
  statusLabel: string;
  deliveryPrice: number;
};

export type OrderDetailView = {
  orderNum: string;
  name: string;
  cell: string;
  email: string;
  name2: string;
  cell2: string;
  postcode: string;
  address1: string;
  address2: string;
  message: string;
  payType: string;
  payStatus: string;
  payTotal: number;
  deliveryTotal: number;
  useMileage: number;
  useCoupon: number;
  signdate: number;
  lines: OrderLineView[];
};

function toOrderLineView(g: { uid: number; g_uid: number; g_name: string; option_name: string; qty: number; price: number; status: number; delivery_price: number }): OrderLineView {
  return {
    ogUid: g.uid,
    goodsUid: g.g_uid,
    goodsName: g.g_name,
    optionValue: g.option_name || null,
    qty: g.qty,
    price: g.price,
    lineTotal: g.price * g.qty,
    status: g.status,
    statusLabel: STATUS_LABELS[g.status] ?? String(g.status),
    deliveryPrice: g.delivery_price,
  };
}

export type OrderDetailAuth = { memberId: string } | { guestName: string; guestPasswordPlain: string };

// Port of php/order_detail.php (member path) and its guest-order-lookup
// twin. This repo simplifies the guest side to "look up one order by
// number + name + password" rather than porting order_list_guest.php's
// full guest order *list* (driven by a guest_where cookie) — that file
// wasn't read; see MIGRATION.md's "나중에 확인할 사항" if a guest order
// history list is needed later.
export async function getOrderDetail(orderNum: string, auth: OrderDetailAuth): Promise<OrderDetailView | null> {
  const order = await prisma.orderInfo.findFirst({ where: { order_num: orderNum, reals: 1 } });
  if (!order) return null;

  if ("memberId" in auth) {
    if (order.id !== auth.memberId) return null;
  } else {
    if (order.id) return null;
    if (order.name.trim().toLowerCase() !== auth.guestName.trim().toLowerCase()) return null;
    const valid = await verifyPassword(order.passwd, auth.guestPasswordPlain);
    if (!valid) return null;
  }

  const goods = await prisma.orderGoods.findMany({ where: { order_num: orderNum }, orderBy: { uid: "asc" } });

  return {
    orderNum: order.order_num,
    name: order.name,
    cell: order.cell,
    email: order.email,
    name2: order.name2,
    cell2: order.cell2,
    postcode: order.postcode,
    address1: order.address1,
    address2: order.address2,
    message: order.message ?? "",
    payType: order.pay_type,
    payStatus: order.pay_status,
    payTotal: order.pay_total,
    deliveryTotal: order.delivery_total,
    useMileage: order.use_mileage,
    useCoupon: order.use_coupon,
    signdate: order.signdate,
    lines: goods.map(toOrderLineView),
  };
}

const ORDERS_PAGE_SIZE = 10;

export type OrderListItem = {
  orderNum: string;
  payType: string;
  payStatus: string;
  payTotal: number;
  signdate: number;
  lines: { goodsName: string; qty: number; status: number; statusLabel: string }[];
};

export type OrderListResult = { items: OrderListItem[]; total: number; page: number; totalPages: number };

// Port of php/order_list.php.
export async function getMyOrders(memberId: string, page = 1): Promise<OrderListResult> {
  const total = await prisma.orderInfo.count({ where: { id: memberId, reals: 1 } });
  const totalPages = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const orders = await prisma.orderInfo.findMany({
    where: { id: memberId, reals: 1 },
    orderBy: { uid: "desc" },
    skip: (safePage - 1) * ORDERS_PAGE_SIZE,
    take: ORDERS_PAGE_SIZE,
  });
  const orderNums = orders.map((o) => o.order_num);
  const goodsRows = orderNums.length ? await prisma.orderGoods.findMany({ where: { order_num: { in: orderNums } } }) : [];
  const byOrderNum = new Map<string, typeof goodsRows>();
  for (const g of goodsRows) {
    const arr = byOrderNum.get(g.order_num) ?? [];
    arr.push(g);
    byOrderNum.set(g.order_num, arr);
  }

  const items = orders.map((o) => ({
    orderNum: o.order_num,
    payType: o.pay_type,
    payStatus: o.pay_status,
    payTotal: o.pay_total,
    signdate: o.signdate,
    lines: (byOrderNum.get(o.order_num) ?? []).map((g) => ({
      goodsName: g.g_name,
      qty: g.qty,
      status: g.status,
      statusLabel: STATUS_LABELS[g.status] ?? String(g.status),
    })),
  }));

  return { items, total, page: safePage, totalPages };
}

export type OrderConfirmation = { orderNum: string; payTotal: number; payType: string; deliveryTotal: number; signdate: number };

// Port of php/order_ok.php. Deliberately minimal (no address/phone) so the
// immediate post-checkout redirect can render for a guest without asking
// them to re-enter their order password on the spot — full detail (with
// PII) still requires getOrderDetail's proper auth.
export async function getOrderConfirmation(orderNum: string): Promise<OrderConfirmation | null> {
  const order = await prisma.orderInfo.findFirst({ where: { order_num: orderNum, reals: 1 } });
  if (!order) return null;
  return {
    orderNum: order.order_num,
    payTotal: order.pay_total,
    payType: order.pay_type,
    deliveryTotal: order.delivery_total,
    signdate: order.signdate,
  };
}
