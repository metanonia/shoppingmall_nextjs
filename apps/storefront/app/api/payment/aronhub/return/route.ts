import type { NextRequest } from "next/server";
import { AronhubPaymentGateway, confirmPgPayment } from "@shoppingmall/core";
import { getDevice } from "@/lib/request";
import { buildPaymentCompleteResponse } from "@/lib/payment-response";

// Port of plugin/aronhub/payUser.php / payUser1.php (USERURL) — where the
// user's own browser lands after the PG popup/full-page flow finishes.
// Legacy has two near-identical files only because of a `direct` filename
// suffix that this repo doesn't need (cart cleanup already happened inside
// createOrder's transaction, not here). The RETURNURL callback is expected
// to have already confirmed payment; confirmPgPayment() is called again
// here too as a second, idempotent safety net in case this leg wins the race.
async function handle(raw: Record<string, string>, requestUrl: string) {
  const gateway = new AronhubPaymentGateway({ paymentShopId: "", paymentShopKey: "" });
  const parsed = gateway.parseCallback(raw);
  const device = await getDevice();

  if (!parsed.ok) {
    console.error("[payment/aronhub/return] parse failed", parsed.reason, raw);
    return buildPaymentCompleteResponse(device, raw.ORDERID ?? "", requestUrl);
  }

  const result = await confirmPgPayment(parsed.orderNum, parsed.pgTransactionId, parsed.amount);
  if (!result.ok) console.error("[payment/aronhub/return] confirm failed", result.reason, parsed);

  return buildPaymentCompleteResponse(device, parsed.orderNum, requestUrl);
}

export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  return handle(raw, request.url);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const raw: Record<string, string> = {};
  for (const [key, value] of formData.entries()) raw[key] = String(value);
  return handle(raw, request.url);
}
