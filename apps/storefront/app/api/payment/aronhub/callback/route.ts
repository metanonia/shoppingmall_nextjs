import { NextResponse } from "next/server";
import { AronhubPaymentGateway, confirmPgPayment } from "@shoppingmall/core";

// Port of plugin/aronhub/payResult.php (RETURNURL) — the PG's server-to-
// server callback. No signature verification exists in the legacy protocol
// (confirmed against the plugin source); confirmPgPayment() is where amount
// verification and idempotency actually get enforced.
export async function POST(request: Request): Promise<NextResponse> {
  const formData = await request.formData();
  const raw: Record<string, string> = {};
  for (const [key, value] of formData.entries()) raw[key] = String(value);

  const gateway = new AronhubPaymentGateway({ paymentShopId: "", paymentShopKey: "" }); // parseCallback needs no credentials, just field shapes
  const parsed = gateway.parseCallback(raw);
  if (!parsed.ok) {
    console.error("[payment/aronhub/callback] parse failed", parsed.reason, raw);
    return new NextResponse("", { status: 400 });
  }

  const result = await confirmPgPayment(parsed.orderNum, parsed.pgTransactionId, parsed.amount);
  if (!result.ok) {
    console.error("[payment/aronhub/callback] confirm failed", result.reason, parsed);
    return new NextResponse("", { status: 409 });
  }

  return new NextResponse("", { status: 200 });
}
