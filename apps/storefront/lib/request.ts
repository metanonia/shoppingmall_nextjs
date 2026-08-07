import { cache } from "react";
import { headers } from "next/headers";
import {
  type Device,
  getBankAccounts,
  getShopConfig,
  getTopBanners,
  getTopLevelCategories,
  getTopMenu,
} from "@shoppingmall/core";

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
  const [device, config] = await Promise.all([getDevice(), getCachedShopConfig()]);
  const [topBanners, categories] = await Promise.all([getTopBanners(device), getTopLevelCategories()]);
  const topMenu = getTopMenu(device === "mobile" ? config.mobileTopMenu : config.designTopMenu);
  const bankAccounts = getBankAccounts(config);
  return { device, config, topBanners, categories, topMenu, bankAccounts };
});
