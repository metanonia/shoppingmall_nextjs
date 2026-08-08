import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { logVisitorEvent } from "@shoppingmall/core";

export async function POST(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const existing = cookieStore.get("visitor_id")?.value;
  const visitorKey = existing || crypto.randomUUID();
  const body = await request.json().catch(() => ({})) as { path?: string; referer?: string };
  await logVisitorEvent({ visitorKey, path: String(body.path ?? "/"), referer: String(body.referer ?? ""), userAgent: headerStore.get("user-agent") ?? "" }).catch(() => {});
  const response = NextResponse.json({ ok: true });
  if (!existing) response.cookies.set("visitor_id", visitorKey, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365, path: "/" });
  return response;
}
