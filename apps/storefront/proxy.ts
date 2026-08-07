import { type NextRequest, NextResponse } from "next/server";
import { detectDevice } from "@shoppingmall/core/device";

// Port of php/init.php:21-24's `$is_mobile = preg_match('/'.MOBILE_AGENT.'/i', ...)`
// device sniff. The legacy site picks a wholly separate template/CSS/JS tree
// per device on every request (no responsive breakpoints) — this header is
// how every Server Component downstream (layout, page) makes the same choice.
//
// Imports from "@shoppingmall/core/device" rather than the package root so this
// Edge-safe regex check doesn't pull in @shoppingmall/db's Node-only MySQL driver.
export function proxy(request: NextRequest) {
  const forcedDevice = request.cookies.get("force_device")?.value;
  const device = forcedDevice === "pc" || forcedDevice === "mobile"
    ? forcedDevice
    : detectDevice(request.headers.get("user-agent"));

  const response = NextResponse.next();
  response.headers.set("x-device", device);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|skin/|image/).*)"],
};
