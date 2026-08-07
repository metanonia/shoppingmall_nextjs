import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { verifyPaymentToken } from "@shoppingmall/auth";
import { getOrderPaymentInfo, getPaymentGateway, type PgPayType } from "@shoppingmall/core";
import { getCachedShopConfig, getDevice } from "@/lib/request";
import { PaymentWidget } from "@/components/PaymentWidget";

// Port of php/order.php's PG widget mount point (php/order.php:369-371's
// `include_once("plugin/{$cp_check}/order.php")`) — split into its own page
// here since the widget needs its own popup/redirect lifecycle rather than
// being inlined at the bottom of the order form.
export default async function OrderPayPage({
  searchParams,
}: {
  searchParams: Promise<{ order_num?: string; token?: string }>;
}) {
  const { order_num: orderNum, token } = await searchParams;
  if (!orderNum || !token) notFound();

  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");

  const payload = await verifyPaymentToken(token, secret);
  if (!payload || payload.orderNum !== orderNum) notFound();

  const order = await getOrderPaymentInfo(orderNum);
  if (!order) notFound();
  if (order.payStatus === "C") redirect(`/order/complete?order_num=${orderNum}`);

  const [config, device] = await Promise.all([getCachedShopConfig(), getDevice()]);
  const gateway = getPaymentGateway(order.payType as PgPayType, config);
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const paymentRequest = await gateway.createPaymentRequest({
    orderNum: order.orderNum,
    amount: order.payTotal,
    payType: order.payType as PgPayType,
    buyerId: order.buyerId,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    itemName: order.itemName,
    returnUrl: new URL("/api/payment/aronhub/callback", origin).toString(),
    userUrl: new URL("/api/payment/aronhub/return", origin).toString(),
    cancelUrl: new URL("/api/payment/aronhub/return", origin).toString(),
  });

  return (
    <div id="contents">
      <h2 className="contentTitle">결제 진행</h2>
      <div className="empty30" />
      <PaymentWidget orderNum={orderNum} token={token} paymentRequest={paymentRequest} payTotal={order.payTotal} device={device} />
    </div>
  );
}
