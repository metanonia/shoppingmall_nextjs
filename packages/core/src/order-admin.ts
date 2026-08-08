import { type Prisma, prisma } from "@shoppingmall/db";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import { STATUS_LABELS, updateDeliveryProgress } from "./order";

export type AdminOrderListFilters = {
  // Whitespace-delimited terms are ANDed across order_num/id/name/cell/email.
  keyword?: string;
  payStatus?: "A" | "B" | "C" | "D";
  payType?: "B" | "C" | "R" | "V" | "H" | "M";
  dateFrom?: string; // yyyy-mm-dd
  dateTo?: string;
  // Line-level progress status (OrderGoods.status — see order.ts's
  // STATUS_LABELS) — matches legacy order_list.php's status dropdown.
  // OrderInfo has no status column of its own, so this filters to orders
  // that have at least one line in the given status.
  status?: number;
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

// Port of managers/order/order_list.php. `default_where = "reals=1"` carried over.
export async function getAdminOrderList(filters: AdminOrderListFilters, page = 1): Promise<AdminOrderListResult> {
  const where: Prisma.OrderInfoWhereInput = { reals: 1 };
  if (filters.keyword) {
    const terms = filters.keyword.trim().split(/\s+/).filter(Boolean);
    where.AND = terms.map((term) => ({ OR: [{ order_num: { contains: term } }, { id: { contains: term } }, { name: { contains: term } }, { cell: { contains: term } }, { email: { contains: term } }] }));
  }
  if (filters.payStatus) where.pay_status = filters.payStatus;
  if (filters.payType) where.pay_type = filters.payType;
  if (filters.dateFrom || filters.dateTo) {
    where.signdate = {
      ...(filters.dateFrom ? { gte: dateToUnix(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: dateToUnix(filters.dateTo, true) } : {}),
    };
  }
  if (filters.status !== undefined) {
    const matchingOrderNums = await prisma.orderGoods.findMany({
      where: { status: filters.status, reals: 1 },
      select: { order_num: true },
      distinct: ["order_num"],
    });
    where.order_num = { in: matchingOrderNums.map((r) => r.order_num) };
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

const ORDER_EXPORT_ROW_CAP = 5000;

// Backs the admin order list's excel-download button — same
// filters/columns as getAdminOrderList, without pagination.
export async function getAdminOrderExportRows(filters: AdminOrderListFilters): Promise<AdminOrderListItem[]> {
  const where: Prisma.OrderInfoWhereInput = { reals: 1 };
  if (filters.keyword) {
    const terms = filters.keyword.trim().split(/\s+/).filter(Boolean);
    where.AND = terms.map((term) => ({ OR: [{ order_num: { contains: term } }, { id: { contains: term } }, { name: { contains: term } }, { cell: { contains: term } }, { email: { contains: term } }] }));
  }
  if (filters.payStatus) where.pay_status = filters.payStatus;
  if (filters.payType) where.pay_type = filters.payType;
  if (filters.dateFrom || filters.dateTo) {
    where.signdate = {
      ...(filters.dateFrom ? { gte: dateToUnix(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: dateToUnix(filters.dateTo, true) } : {}),
    };
  }
  if (filters.status !== undefined) {
    const matchingOrderNums = await prisma.orderGoods.findMany({
      where: { status: filters.status, reals: 1 },
      select: { order_num: true },
      distinct: ["order_num"],
    });
    where.order_num = { in: matchingOrderNums.map((r) => r.order_num) };
  }

  const orders = await prisma.orderInfo.findMany({ where, orderBy: { uid: "desc" }, take: ORDER_EXPORT_ROW_CAP });
  const orderNums = orders.map((o) => o.order_num);
  const goodsRows = orderNums.length ? await prisma.orderGoods.findMany({ where: { order_num: { in: orderNums } } }) : [];
  const byOrderNum = new Map<string, typeof goodsRows>();
  for (const g of goodsRows) {
    const arr = byOrderNum.get(g.order_num) ?? [];
    arr.push(g);
    byOrderNum.set(g.order_num, arr);
  }

  return orders.map((o) => {
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

export type SalesStatsPoint = { date: string; orderCount: number; salesTotal: number; pcOrderCount: number; pcSalesTotal: number; mobileOrderCount: number; mobileSalesTotal: number };
export type SalesStatsResult = { points: SalesStatsPoint[]; totalOrderCount: number; totalSalesTotal: number; payTypeTotals: { payType: string; count: number; total: number }[] };

// Port of managers/order/sales_statistics*.php: daily order/revenue totals,
// PC/mobile split and payment-type summary.
export async function getSalesStats(dateFrom: string, dateTo: string): Promise<SalesStatsResult> {
  const fromUnix = dateToUnix(dateFrom);
  const toUnix = dateToUnix(dateTo, true);

  const orders = await prisma.orderInfo.findMany({
    where: { reals: 1, signdate: { gte: fromUnix, lte: toUnix } },
    select: { signdate: true, pay_total: true, mobile: true, pay_type: true },
  });

  const byDate = new Map<string, Omit<SalesStatsPoint, "date">>();
  const byPayType = new Map<string, { count: number; total: number }>();
  for (const order of orders) {
    const dateKey = new Date(order.signdate * 1000).toISOString().slice(0, 10);
    const point = byDate.get(dateKey) ?? { orderCount: 0, salesTotal: 0, pcOrderCount: 0, pcSalesTotal: 0, mobileOrderCount: 0, mobileSalesTotal: 0 };
    point.orderCount += 1;
    point.salesTotal += order.pay_total;
    if (order.mobile === "Y") { point.mobileOrderCount += 1; point.mobileSalesTotal += order.pay_total; }
    else { point.pcOrderCount += 1; point.pcSalesTotal += order.pay_total; }
    byDate.set(dateKey, point);
    const pay = byPayType.get(order.pay_type) ?? { count: 0, total: 0 };
    pay.count += 1; pay.total += order.pay_total; byPayType.set(order.pay_type, pay);
  }

  const points = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  return {
    points,
    totalOrderCount: orders.length,
    totalSalesTotal: orders.reduce((sum, o) => sum + o.pay_total, 0),
    payTypeTotals: Array.from(byPayType.entries()).map(([payType, value]) => ({ payType, ...value })),
  };
}

export type OrderCancelCpLogItem = {
  uid: number;
  orderNum: string;
  ogUid: number;
  price: number;
  remPrice: number;
  payType: string;
  status: number;
  message: string;
  proc: boolean;
  signdate: number;
};

export type OrderCancelCpLogResult = { items: OrderCancelCpLogItem[]; total: number; page: number; totalPages: number };

const CANCEL_CP_LOG_PAGE_SIZE = 30;

// Port of managers/order/order_cancel_cp_log_list.php — order.ts's
// orderStatus95 writes this every time a PG cancel is attempted.
export async function getOrderCancelCpLogList(filters: { keyword?: string; status?: number }, page = 1): Promise<OrderCancelCpLogResult> {
  const where = {
    ...(filters.status !== undefined ? { status: filters.status } : {}),
    ...(filters.keyword ? { order_num: { contains: filters.keyword } } : {}),
  };

  const total = await prisma.orderCancelCpLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / CANCEL_CP_LOG_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const rows = await prisma.orderCancelCpLog.findMany({
    where,
    orderBy: { uid: "desc" },
    skip: (safePage - 1) * CANCEL_CP_LOG_PAGE_SIZE,
    take: CANCEL_CP_LOG_PAGE_SIZE,
  });

  return {
    items: rows.map((r) => ({
      uid: r.uid,
      orderNum: r.order_num,
      ogUid: r.og_uid,
      price: r.price,
      remPrice: r.rem_price,
      payType: r.pay_type,
      status: r.status,
      message: r.message,
      proc: r.proc === 1,
      signdate: r.signdate,
    })),
    total,
    page: safePage,
    totalPages,
  };
}

export async function markOrderCancelCpLogProcessed(uid: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const updated = await prisma.orderCancelCpLog.updateMany({ where: { uid }, data: { proc: 1 } });
  if (updated.count === 0) return { ok: false, error: "존재하지 않는 로그입니다." };
  return { ok: true };
}

const DELIVERY_EXCEL_HEADERS = ["주문일시", "주문번호", "주문상품고유값", "송장번호", "주문상품명", "옵션정보", "주문상품수량", "주문상태", "수령자명", "수령자연락처", "배송지우편번호", "배송지", "요청사항"];

export async function createDeliveryExcelBuffer(): Promise<Buffer> {
  const lines = await prisma.orderGoods.findMany({
    where: { vendor_delivery: "", reals: 1, status: { in: [1, 2] } },
    orderBy: { uid: "asc" },
  });
  const orders = await prisma.orderInfo.findMany({ where: { order_num: { in: lines.map((line) => line.order_num) }, reals: 1 } });
  const byNumber = new Map(orders.map((order) => [order.order_num, order]));
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("송장등록");
  sheet.addRow(DELIVERY_EXCEL_HEADERS);
  for (const line of lines) {
    const order = byNumber.get(line.order_num);
    if (!order) continue;
    sheet.addRow([
      new Date(order.signdate * 1000).toLocaleString("sv-SE"), line.order_num, line.uid, "", line.g_name,
      line.option_name, line.qty, STATUS_LABELS[line.status] ?? line.status, order.name2, order.cell2,
      order.postcode, `${order.address1} ${order.address2}`.trim(), order.message ?? "",
    ]);
  }
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((column, index) => { column.width = index === 11 || index === 12 ? 40 : 20; });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function parseDeliveryExcelRows(buffer: ArrayBuffer): { orderNum: string; ogUid: number; trackingNumber: string }[] {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) throw new Error("EMPTY_WORKBOOK");
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, raw: false, defval: "" });
  const header = rows[0] ?? [];
  if (String(header[1]).trim() !== "주문번호" || String(header[3]).trim() !== "송장번호") throw new Error("INVALID_DELIVERY_TEMPLATE");
  const requested: { orderNum: string; ogUid: number; trackingNumber: string }[] = [];
  for (const row of rows.slice(1)) {
    const orderNum = String(row[1] ?? "").trim();
    const ogUid = Number(row[2]);
    const trackingNumber = String(row[3] ?? "").trim();
    if (orderNum && Number.isInteger(ogUid) && trackingNumber) requested.push({ orderNum, ogUid, trackingNumber });
  }
  return requested;
}

export async function importDeliveryExcel(buffer: ArrayBuffer, carrier: string, actorId: string): Promise<{ ok: true; updated: number } | { ok: false; error: string }> {
  if (!carrier.trim()) return { ok: false, error: "택배사를 입력해 주세요." };
  let requested: { orderNum: string; ogUid: number; trackingNumber: string }[];
  try {
    requested = parseDeliveryExcelRows(buffer);
  } catch {
    return { ok: false, error: "송장 일괄등록 양식이 아닙니다." };
  }
  if (requested.length === 0) return { ok: false, error: "등록할 송장번호가 없습니다." };

  const lines = await prisma.orderGoods.findMany({ where: { uid: { in: requested.map((item) => item.ogUid) }, vendor_delivery: "", reals: 1, status: { in: [1, 2] } } });
  const allowed = new Map(lines.map((line) => [line.uid, line]));
  const groups = new Map<string, { orderNum: string; trackingNumber: string; ogUids: number[] }>();
  for (const item of requested) {
    const line = allowed.get(item.ogUid);
    if (!line || line.order_num !== item.orderNum) continue;
    const key = `${item.orderNum}\u0000${item.trackingNumber}`;
    const group = groups.get(key) ?? { orderNum: item.orderNum, trackingNumber: item.trackingNumber, ogUids: [] };
    group.ogUids.push(item.ogUid);
    groups.set(key, group);
  }
  let updated = 0;
  for (const group of groups.values()) {
    const result = await updateDeliveryProgress(group.orderNum, group.ogUids, actorId, { status: 3, carrier: carrier.trim(), trackingNumber: group.trackingNumber });
    if (result.ok) updated += group.ogUids.length;
  }
  return updated > 0 ? { ok: true, updated } : { ok: false, error: "처리 가능한 결제완료/배송준비중 본사배송 상품이 없습니다." };
}
