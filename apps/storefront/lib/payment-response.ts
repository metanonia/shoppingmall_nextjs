import { NextResponse } from "next/server";
import type { Device } from "@shoppingmall/core";

// Shared by the aronhub return route and the mock checkout route — both are
// "the user's browser lands back on our site after a PG payment attempt"
// endpoints, just reached via different paths (real PG redirect vs. our own
// mock "payment window"). PC uses postMessage back to the opener window
// (mirrors legacy's popup + poll pattern in orderProc.js's npay_ck()); mobile
// has no popup (full-page flow) so it just redirects.
export function buildPaymentCompleteResponse(device: Device, orderNum: string, baseUrl: string): NextResponse {
  if (device === "mobile") {
    return NextResponse.redirect(new URL(`/order/complete?order_num=${encodeURIComponent(orderNum)}`, baseUrl));
  }

  const completeUrl = new URL(`/order/complete?order_num=${encodeURIComponent(orderNum)}`, baseUrl).toString();
  const html = `<!doctype html>
<html><body>
<script>
  var orderNum = ${JSON.stringify(orderNum)};
  if (window.opener) {
    window.opener.postMessage({ type: "payment-complete", orderNum: orderNum }, window.location.origin);
    window.close();
  } else {
    location.href = ${JSON.stringify(completeUrl)};
  }
</script>
</body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
