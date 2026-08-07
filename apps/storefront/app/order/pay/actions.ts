"use server";

import { verifyPaymentToken } from "@shoppingmall/auth";
import { getOrderPaymentInfo, orderStatus9 } from "@shoppingmall/core";

// Called directly from client-side event handlers (popup-closed poll on PC,
// `pageshow`/bfcache on mobile) rather than bound to a <form>, so these are
// plain async functions instead of the (prevState, formData) shape used
// elsewhere in this app.

async function requireOrder(orderNum: string, token: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const payload = await verifyPaymentToken(token, secret);
  if (!payload || payload.orderNum !== orderNum) return null;
  return getOrderPaymentInfo(orderNum);
}

// Port of the "포기" half of plugin/aronhub/close.php /
// php/order_cp_cancel_json.php, re-expressed with this repo's already-atomic
// order model: since createOrder commits the order (and its stock) up front
// rather than leaving a `reals=0` draft row, "the user closed the payment
// popup without paying" is just an ordinary pre-payment cancel.
export async function abandonPendingPayment(orderNum: string, token: string): Promise<{ ok: boolean }> {
  const order = await requireOrder(orderNum, token);
  if (!order) return { ok: false };
  if (order.payStatus === "C") return { ok: true }; // already confirmed by a race-winning callback — nothing to abandon

  const result = await orderStatus9(orderNum, order.buyerId || "guest");
  return { ok: result.ok };
}

export async function getPendingPaymentStatus(orderNum: string, token: string): Promise<{ payStatus: string } | null> {
  const order = await requireOrder(orderNum, token);
  if (!order) return null;
  return { payStatus: order.payStatus };
}
