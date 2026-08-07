import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

// Port of php/logout.php.
export async function GET(request: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/", request.url));
}
