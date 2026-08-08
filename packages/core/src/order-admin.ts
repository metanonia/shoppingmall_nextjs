import { type Prisma, prisma } from "@shoppingmall/db";
import { STATUS_LABELS } from "./order";

export type AdminOrderListFilters = {
  // Single-keyword search across order_num/id/name/cell/email — this repo's
  // established simplification vs legacy order_list.php's multi-field AND
  // search (field/field2/field3/field4), same precedent as listing.ts.
  keyword?: string;
  payStatus?: "A" | "B" | "C" | "D";
  payType?: "B" | "C" | "R" | "V" | "H" | "M";
  dateFrom?: string; // yyyy-mm-dd
  dateTo?: string;
};

export type AdminOrderListItem = {
  orderNum: string;
  buyerId: string;
  name: string;
  payType: string;
  payStatus: string;
  payTotal: number;
  signdate: number;
  itemSummary: string;
};

export type AdminOrderListResult = { items: AdminOrderListItem[]; total: number; page: number; totalPages: number };

const ADMIN_ORDERS_PAGE_SIZE = 20;

function dateToUnix(dateStr: string, endOfDay = false): number {
  return Math.floor(new Date(`${dateStr}T${endOfDay ? "23:59:59" : "00:00:00"}`).getTime() / 1000);
}

// Port of managers/order/order_list.php, filters trimmed per
// AdminOrderListFilters' comment. `default_where = "reals=1"` carried over.
export async function getAdminOrderList(filters: AdminOrderListFilters, page = 1): Promise<AdminOrderListResult> {
  const where: Prisma.OrderInfoWhereInput = { reals: 1 };
  if (filters.keyword) {
    where.OR = [
      { order_num: { contains: filters.keyword } },
      { id: { contains: filters.keyword } },
      { name: { contains: filters.keyword } },
      { cell: { contains: filters.keyword } },
      { email: { contains: filters.keyword } },
    ];
  }
  if (filters.payStatus) where.pay_status = filters.payStatus;
  if (filters.payType) where.pay_type = filters.payType;
  if (filters.dateFrom || filters.dateTo) {
    where.signdate = {
      ...(filters.dateFrom ? { gte: dateToUnix(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: dateToUnix(filters.dateTo, true) } : {}),
    };
  }

  const total = await prisma.orderInfo.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_ORDERS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const orders = await prisma.orderInfo.findMany({
    where,
    orderBy: { uid: "desc" },
    skip: (safePage - 1) * ADMIN_ORDERS_PAGE_SIZE,
    take: ADMIN_ORDERS_PAGE_SIZE,
  });
  const orderNums = orders.map((o) => o.order_num);
  const goodsRows = orderNums.length ? await prisma.orderGoods.findMany({ where: { order_num: { in: orderNums } } }) : [];
  const byOrderNum = new Map<string, typeof goodsRows>();
  for (const g of goodsRows) {
    const arr = byOrderNum.get(g.order_num) ?? [];
    arr.push(g);
    byOrderNum.set(g.order_num, arr);
  }

  const items = orders.map((o) => {
    const lines = byOrderNum.get(o.order_num) ?? [];
    return {
      orderNum: o.order_num,
      buyerId: o.id || "게스트",
      name: o.name,
      payType: o.pay_type,
      payStatus: o.pay_status,
      payTotal: o.pay_total,
      signdate: o.signdate,
      itemSummary: lines.length > 0 ? `${lines[0].g_name}${lines.length > 1 ? ` 외 ${lines.length - 1}건` : ""}` : "",
    };
  });

  return { items, total, page: safePage, totalPages };
}

export type AdminOrderLineView = {
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
  deliveryInfo: string;
  mileage: number;
  useCoupon: number;
  couponUid: number;
};

export type AdminOrderDetailView = {
  orderNum: string;
  buyerId: string;
  name: string;
  cell: string;
  email: string;
  name2: string;
  cell2: string;
  postcode: string;
  address1: string;
  address2: string;
  message: string;
  memo: string;
  payType: string;
  payStatus: string;
  payTotal: number;
  deliveryTotal: number;
  cancelTotal: number;
  refundTotal: number;
  useMileage: number;
  useCoupon: number;
  couponUid: number;
  signdate: number;
  lines: AdminOrderLineView[];
};

// Admin-only detail fetch — bypasses the member/guest-password ownership
// gate getOrderDetail() enforces (order.ts), since the caller here already
// holds an admin session.
export async function getAdminOrderDetail(orderNum: string): Promise<AdminOrderDetailView | null> {
  const order = await prisma.orderInfo.findFirst({ where: { order_num: orderNum, reals: 1 } });
  if (!order) return null;
  const goods = await prisma.orderGoods.findMany({ where: { order_num: orderNum }, orderBy: { uid: "asc" } });

  return {
    orderNum: order.order_num,
    buyerId: order.id || "게스트",
    name: order.name,
    cell: order.cell,
    email: order.email,
    name2: order.name2,
    cell2: order.cell2,
    postcode: order.postcode,
    address1: order.address1,
    address2: order.address2,
    message: order.message ?? "",
    memo: order.memo,
    payType: order.pay_type,
    payStatus: order.pay_status,
    payTotal: order.pay_total,
    deliveryTotal: order.delivery_total,
    cancelTotal: order.cancel_total,
    refundTotal: order.refund_total,
    useMileage: order.use_mileage,
    useCoupon: order.use_coupon,
    couponUid: order.coupon_uid,
    signdate: order.signdate,
    lines: goods.map((g) => ({
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
      deliveryInfo: g.delivery_info,
      mileage: g.mileage,
      useCoupon: g.use_coupon,
      couponUid: g.coupon_uid,
    })),
  };
}

export type OrderAdminUpdateResult = { ok: true } | { ok: false; error: string };

// Port of order_post.php's `memo` mode.
export async function updateOrderMemo(orderNum: string, memo: string): Promise<OrderAdminUpdateResult> {
  const updated = await prisma.orderInfo.updateMany({ where: { order_num: orderNum }, data: { memo } });
  if (updated.count === 0) return { ok: false, error: "존재하지 않는 주문입니다." };
  return { ok: true };
}

export type UpdateOrderAddressInput = { postcode: string; address1: string; address2: string };

// Port of order_post.php's `address` mode.
export async function updateOrderAddress(orderNum: string, input: UpdateOrderAddressInput): Promise<OrderAdminUpdateResult> {
  const updated = await prisma.orderInfo.updateMany({ where: { order_num: orderNum }, data: input });
  if (updated.count === 0) return { ok: false, error: "존재하지 않는 주문입니다." };
  return { ok: true };
}

export type SalesStatsPoint = { date: string; orderCount: number; salesTotal: number };
export type SalesStatsResult = { points: SalesStatsPoint[]; totalOrderCount: number; totalSalesTotal: number };

// Port of managers/order/sales_statistics*.php, reduced to daily order-count
// + revenue totals over a date range (a simple GROUP BY in legacy — no
// visitor/keyword stats, see MIGRATION.md's Phase 7 scope notes on why
// those need infrastructure this migration doesn't have yet).
export async function getSalesStats(dateFrom: string, dateTo: string): Promise<SalesStatsResult> {
  const fromUnix = dateToUnix(dateFrom);
  const toUnix = dateToUnix(dateTo, true);

  const orders = await prisma.orderInfo.findMany({
    where: { reals: 1, signdate: { gte: fromUnix, lte: toUnix } },
    select: { signdate: true, pay_total: true },
  });

  const byDate = new Map<string, { orderCount: number; salesTotal: number }>();
  for (const order of orders) {
    const dateKey = new Date(order.signdate * 1000).toISOString().slice(0, 10);
    const point = byDate.get(dateKey) ?? { orderCount: 0, salesTotal: 0 };
    point.orderCount += 1;
    point.salesTotal += order.pay_total;
    byDate.set(dateKey, point);
  }

  const points = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  return {
    points,
    totalOrderCount: orders.length,
    totalSalesTotal: orders.reduce((sum, o) => sum + o.pay_total, 0),
  };
}
