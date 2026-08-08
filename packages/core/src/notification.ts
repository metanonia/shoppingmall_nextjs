import { prisma } from "@shoppingmall/db";
import { getShopConfig } from "./config";
import { renderOrderPaidEmail, renderOrderReceivedEmail, sendMail } from "./mailer";
import { renderOrderPaidSms, renderOrderReceivedSms, renderVendorPaidSms, sendSms } from "./sms";

async function loadOrderForNotification(orderNum: string) {
  const order = await prisma.orderInfo.findFirst({ where: { order_num: orderNum } });
  if (!order) return null;
  const lines = await prisma.orderGoods.findMany({ where: { order_num: orderNum } });
  const config = await getShopConfig();
  return { order, lines, config };
}

// Port of php/async_order_mail.php's order-received half (`type='order'`
// mail template + `mallSmsAuto('order', ...)`). Legacy fires this
// fire-and-forget via a raw socket POST so the checkout page doesn't wait on
// it; here the caller (createOrder) is expected to call this AFTER its
// transaction commits and not await-block the response on it mattering —
// every step below is independently try/caught so one channel failing never
// blocks the other, and this function itself never throws.
export async function notifyOrderCreated(orderNum: string): Promise<void> {
  const data = await loadOrderForNotification(orderNum);
  if (!data) return;
  const { order, lines, config } = data;

  await prisma.orderInfo.update({ where: { order_num: orderNum }, data: { mail_send: 1 } });

  const orderReceivedEmail = await renderOrderReceivedEmail({
    shopName: config.basicName,
    orderNum,
    lines: lines.map((l) => ({ goodsName: l.g_name, qty: l.qty, lineTotal: l.price * l.qty })),
    payTotal: order.pay_total,
  });
  const emailResult = await trySend(() => sendMail({ to: order.email, subject: orderReceivedEmail.subject, html: orderReceivedEmail.html }));

  await trySend(() =>
    sendSms(
      { to: order.cell, text: renderOrderReceivedSms({ shopName: config.basicName, orderName: order.name, orderNum, price: order.pay_total }) },
      config,
    ),
  );

  if (emailResult) await prisma.orderInfo.update({ where: { order_num: orderNum }, data: { mail_ok: 1 } });
}

// Port of php/async_order_mail.php's post-payment half + the pay_type=='B'
// branch inside lib.Shop.php:1462 orderStatus1() (bank_ok customer SMS +
// pay_ok2 vendor SMS). Called for M (mileage, instant) and C/H (PG, once
// confirmPgPayment() runs) — B stays gated behind a Phase 7 admin action
// that doesn't exist yet, so this never fires for bank-transfer orders
// until then (see MIGRATION.md's "나중에 확인할 사항").
export async function notifyOrderPaid(orderNum: string): Promise<void> {
  const data = await loadOrderForNotification(orderNum);
  if (!data) return;
  const { order, lines, config } = data;

  const orderPaidEmail = await renderOrderPaidEmail({
    shopName: config.basicName,
    orderNum,
    lines: lines.map((l) => ({ goodsName: l.g_name, qty: l.qty, lineTotal: l.price * l.qty })),
    payTotal: order.pay_total,
  });
  const emailResult = await trySend(() => sendMail({ to: order.email, subject: orderPaidEmail.subject, html: orderPaidEmail.html }));
  await prisma.orderInfo.update({ where: { order_num: orderNum }, data: { mail_send: 1, ...(emailResult ? { mail_ok: 1 } : {}) } });

  await trySend(() =>
    sendSms(
      { to: order.cell, text: renderOrderPaidSms({ shopName: config.basicName, orderName: order.name, orderNum, price: order.pay_total }) },
      config,
    ),
  );

  // Port of lib.Shop.php:1657-1669's vendor loop — one SMS per distinct
  // vendor with a contact cell, direct-sold (vendor === "") lines skipped.
  const vendorIds = Array.from(new Set(lines.map((l) => l.vendor).filter(Boolean)));
  for (const vendorId of vendorIds) {
    const vendor = await prisma.vendor.findFirst({ where: { id: vendorId }, select: { cont_cell: true } });
    if (!vendor?.cont_cell) continue;
    await trySend(() =>
      sendSms({ to: vendor.cont_cell, text: renderVendorPaidSms({ shopName: config.basicName, orderName: order.name }) }, config),
    );
  }
}

async function trySend<T extends { ok: boolean }>(fn: () => Promise<T>): Promise<boolean> {
  try {
    const result = await fn();
    return result.ok;
  } catch {
    return false;
  }
}
