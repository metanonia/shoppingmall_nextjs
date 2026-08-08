import { prisma } from "@shoppingmall/db";
import { STATUS_LABELS } from "./order";

export type VendorOrderListFilters = { keyword?: string };

export type VendorOrderListItem = {
  orderNum: string;
  buyerName: string;
  itemSummary: string;
  signdate: number;
};

export type VendorOrderListResult = { items: VendorOrderListItem[]; total: number; page: number; totalPages: number };

const VENDOR_ORDERS_PAGE_SIZE = 20;

// Port of vendor/order/order_list.php — scoped to lines this vendor
// actually ships (vendor_delivery, same column createOrder already stamps
// per line), unlike admin's order-admin.ts which sees every order.
export async function getVendorOrderList(vendorId: string, filters: VendorOrderListFilters, page = 1): Promise<VendorOrderListResult> {
  const lineWhere = {
    vendor_delivery: vendorId,
    reals: 1,
    ...(filters.keyword ? { OR: [{ order_num: { contains: filters.keyword } }, { g_name: { contains: filters.keyword } }] } : {}),
  };

  const orderNums = await prisma.orderGoods.findMany({ where: lineWhere, select: { order_num: true }, distinct: ["order_num"] });
  const total = orderNums.length;
  const totalPages = Math.max(1, Math.ceil(total / VENDOR_ORDERS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const orders = await prisma.orderInfo.findMany({
    where: { order_num: { in: orderNums.map((o) => o.order_num) }, reals: 1 },
    orderBy: { uid: "desc" },
    skip: (safePage - 1) * VENDOR_ORDERS_PAGE_SIZE,
    take: VENDOR_ORDERS_PAGE_SIZE,
  });

  const lines = orders.length
    ? await prisma.orderGoods.findMany({ where: { order_num: { in: orders.map((o) => o.order_num) }, vendor_delivery: vendorId } })
    : [];
  const byOrderNum = new Map<string, typeof lines>();
  for (const line of lines) {
    const arr = byOrderNum.get(line.order_num) ?? [];
    arr.push(line);
    byOrderNum.set(line.order_num, arr);
  }

  return {
    items: orders.map((o) => {
      const myLines = byOrderNum.get(o.order_num) ?? [];
      return {
        orderNum: o.order_num,
        buyerName: o.name,
        itemSummary: myLines.length > 0 ? `${myLines[0].g_name}${myLines.length > 1 ? ` 외 ${myLines.length - 1}건` : ""}` : "",
        signdate: o.signdate,
      };
    }),
    total,
    page: safePage,
    totalPages,
  };
}

export type VendorOrderLineView = {
  ogUid: number;
  goodsName: string;
  optionValue: string | null;
  qty: number;
  price: number;
  lineTotal: number;
  status: number;
  statusLabel: string;
  deliveryInfo: string;
};

export type VendorOrderDetailView = {
  orderNum: string;
  buyerName: string;
  receiverName: string;
  receiverCell: string;
  postcode: string;
  address1: string;
  address2: string;
  message: string;
  signdate: number;
  lines: VendorOrderLineView[];
};

// Only returns this vendor's own lines within the order — a mixed-vendor
// order's other lines are invisible here, matching legacy's vendor
// order_post.php scoping (every query there filters vendor_delivery too).
export async function getVendorOrderDetail(vendorId: string, orderNum: string): Promise<VendorOrderDetailView | null> {
  const order = await prisma.orderInfo.findFirst({ where: { order_num: orderNum, reals: 1 } });
  if (!order) return null;

  const lines = await prisma.orderGoods.findMany({ where: { order_num: orderNum, vendor_delivery: vendorId }, orderBy: { uid: "asc" } });
  if (lines.length === 0) return null;

  return {
    orderNum: order.order_num,
    buyerName: order.name,
    receiverName: order.name2,
    receiverCell: order.cell2,
    postcode: order.postcode,
    address1: order.address1,
    address2: order.address2,
    message: order.message ?? "",
    signdate: order.signdate,
    lines: lines.map((l) => ({
      ogUid: l.uid,
      goodsName: l.g_name,
      optionValue: l.option_name || null,
      qty: l.qty,
      price: l.price,
      lineTotal: l.price * l.qty,
      status: l.status,
      statusLabel: STATUS_LABELS[l.status] ?? String(l.status),
      deliveryInfo: l.delivery_info,
    })),
  };
}

// Ownership guard shared by the vendor order-action layer — confirms every
// og_uid in a batch actually belongs to this vendor before delegating to
// order.ts's shared state-machine functions (updateDeliveryProgress etc.),
// which have no vendor concept of their own.
export async function assertOwnsOrderLines(vendorId: string, orderNum: string, ogUids: number[]): Promise<boolean> {
  if (ogUids.length === 0) return false;
  const count = await prisma.orderGoods.count({ where: { order_num: orderNum, uid: { in: ogUids }, vendor_delivery: vendorId } });
  return count === ogUids.length;
}
