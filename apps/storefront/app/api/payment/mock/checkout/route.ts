import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { confirmPgPayment, getOrderConfirmation } from "@shoppingmall/core";
import { getDevice } from "@/lib/request";
import { buildPaymentCompleteResponse } from "@/lib/payment-response";

// Stands in for a real PG's hosted payment page + callback in local
// dev/test (see packages/core/src/payment.ts's MockPaymentGateway). Confirms
// payment immediately using the amount the server itself already knows for
// this order — a client-supplied amount is never trusted, same principle as
// the real AronhubPaymentGateway path.
export async function GET(request: NextRequest) {
  const orderNum = request.nextUrl.searchParams.get("orderNum");
  if (!orderNum) return new NextResponse("missing orderNum", { status: 400 });

  const order = await getOrderConfirmation(orderNum);
  if (!order || (order.payType !== "C" && order.payType !== "H")) {
    return new NextResponse("order not found", { status: 404 });
  }

  const result = await confirmPgPayment(orderNum, `MOCK-${orderNum}`, order.payTotal);
  if (!result.ok) console.error("[payment/mock/checkout] confirm failed", result.reason, orderNum);

  const device = await getDevice();
  return buildPaymentCompleteResponse(device, orderNum, request.url);
}
