import { NextResponse } from "next/server";
import { runDailyBatch } from "@shoppingmall/core";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

// Node equivalent of legacy's self-pinged async_day_proc.php — meant to be
// invoked by an external scheduler (system crontab + curl; see MIGRATION.md)
// rather than an always-on in-process scheduler, since this repo has no
// persistent server process infra beyond `next dev`/a production Next
// server.
export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorizedCronRequest(request)) return new NextResponse("", { status: 401 });

  const result = await runDailyBatch();
  return NextResponse.json(result);
}
