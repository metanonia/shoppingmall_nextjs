import { NextResponse } from "next/server";
import { logDbError, pollDeliveryTracking } from "@shoppingmall/core";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

// Node equivalent of legacy's self-pinged async_tracker.php — see
// app/api/cron/daily/route.ts for the trigger-model rationale (external
// scheduler + bearer secret, no in-process scheduler).
export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request)) return new NextResponse("", { status: 401 });

  try {
    const result = await pollDeliveryTracking();
    return NextResponse.json(result);
  } catch (err) {
    await logDbError("cron/tracker", err);
    return new NextResponse("", { status: 500 });
  }
}
