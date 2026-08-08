import { prisma } from "@shoppingmall/db";
import { getShopConfig } from "./config";

function now() { return Math.floor(Date.now() / 1000); }

// Port of lib.Shop.php cashReceiptsApply(): creates the issuance request
// after a cash-like payment is confirmed. PG transmission is handled by the
// configured payment adapter; manual mode leaves status=0 for staff action.
export async function ensureCashReceiptRequest(orderNum: string): Promise<void> {
  const [config, order, existing, lines] = await Promise.all([
    getShopConfig(),
    prisma.orderInfo.findFirst({ where: { order_num: orderNum, reals: 1 } }),
    prisma.orderCashReceipt.findFirst({ where: { order_num: orderNum } }),
    prisma.orderGoods.findMany({ where: { order_num: orderNum, reals: 1 }, select: { g_name: true } }),
  ]);
  if (!config.cashReceiptsUsed || !order || existing || !["B", "R", "V"].includes(order.pay_type) || !order.cash_receipts || !order.status_date) return;
  const [type, authNumber] = order.cash_receipts.split("|");
  const goodsName = lines.length > 1 ? `${lines[0]?.g_name ?? "상품"}외 ${lines.length - 1}건` : (lines[0]?.g_name ?? "상품");
  await prisma.orderCashReceipt.create({ data: {
    order_num: orderNum,
    id: order.id,
    name: order.name,
    cell: order.cell,
    email: order.email,
    price: Math.max(0, order.pay_total - order.refund_total - order.cancel_total),
    goods_name: goodsName,
    pay_type: order.pay_type,
    tax_type: config.cashReceiptsType === 1 ? 1 : 0,
    cash_type: type === "2" ? 1 : 0,
    auth_number: authNumber ?? "",
    signdate: now(),
  } });
}

export async function getCashReceiptList(page = 1, pageSize = 20) {
  const total = await prisma.orderCashReceipt.count();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const items = await prisma.orderCashReceipt.findMany({ orderBy: { uid: "desc" }, skip: (safePage - 1) * pageSize, take: pageSize });
  return { items, total, page: safePage, totalPages };
}

export async function updateCashReceiptStatus(uid: number, status: 1 | 2 | 3 | 4, info = ""): Promise<void> {
  await prisma.orderCashReceipt.update({ where: { uid }, data: { status, status_date: now(), receipt_info: info } });
}

export async function deleteCashReceipt(uid: number): Promise<void> {
  await prisma.orderCashReceipt.delete({ where: { uid } });
}
