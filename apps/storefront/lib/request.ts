import { cache } from "react";
import { headers } from "next/headers";
import {
  type Device,
  getBankAccounts,
  getMemberDiscountPct,
  getMemberProfile,
  getShopConfig,
  getTopBanners,
  getTopLevelCategories,
  getTopMenu,
} from "@shoppingmall/core";
import { getSession } from "./auth";

// React.cache memoizes these per request so layout.tsx and page.tsx (both of
// which need the device + shop config) don't each issue their own query.
export const getCachedShopConfig = cache(getShopConfig);

// Port of php/init.php:94 `if($shop_config['mobile_yn'] == 'N') $mobile_header = "";`
// — the admin-configurable kill switch that forces desktop regardless of the
// User-Agent sniff middleware.ts already did.
export const getDevice = cache(async (): Promise<Device> => {
  const h = await headers();
  const uaDevice: Device = h.get("x-device") === "mobile" ? "mobile" : "pc";
  const config = await getCachedShopConfig();
  if (config.mobileYn === "N") return "pc";
  return uaDevice;
});

// Shared across every page's layout: top nav (logo/menu/categories) + footer
// (bank accounts) data. Cached per request so navigating between pages only
// re-fetches what each page actually adds (goods lists, product detail, ...).
export const getSiteChrome = cache(async () => {
  const [device, config, session] = await Promise.all([getDevice(), getCachedShopConfig(), getSession()]);
  const [topBanners, categories, member] = await Promise.all([
    getTopBanners(device),
    getTopLevelCategories(),
    session ? getMemberProfile(session.userId) : Promise.resolve(null),
  ]);
  const topMenu = getTopMenu(device === "mobile" ? config.mobileTopMenu : config.designTopMenu);
  const bankAccounts = getBankAccounts(config);
  return { device, config, topBanners, categories, topMenu, bankAccounts, member };
});

// Port of lib/checkLogin.php's $my_discount lookup, memoized per request like
// the rest of getSiteChrome's session-derived data.
export const getCachedMemberDiscountPct = cache(async (): Promise<number> => {
  const { member } = await getSiteChrome();
  return member ? getMemberDiscountPct(member.level) : 0;
});

// Best-effort client IP for the guest half of php/top.php's recent-keyword
// scoping (member id when logged in, IP otherwise) — there's no NextRequest.ip
// in the app router, so this reads the proxy header directly.
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "";
}
