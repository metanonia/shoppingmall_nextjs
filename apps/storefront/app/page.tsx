import { cookies } from "next/headers";
import { getActivePopups, getHomeSections, getMainBanners } from "@shoppingmall/core";
import { getCachedMemberDiscountPct, getCachedShopConfig, getDevice } from "@/lib/request";
import { MainBannerCenter, MainRollingBanner } from "@/components/MainBanners";
import { HomeSections } from "@/components/HomeSections";
import { PopupLayer } from "@/components/PopupLayer";

// Port of php/main.php + commonBannerCheck('main'), scoped to the Phase 1
// vertical slice. Nav/footer chrome now lives in app/layout.tsx (every
// channel wraps its content in the same header/top/bottom, per index.php).
// Popups (php/bottom.php:109 `if($channel == "main")`) only render here.
export default async function HomePage() {
  const device = await getDevice();
  const config = await getCachedShopConfig();
  const memberDiscountPct = await getCachedMemberDiscountPct();

  const cookieStore = await cookies();
  const dismissedPopupUids = cookieStore
    .getAll()
    .filter((c) => c.name.startsWith("popup_"))
    .map((c) => Number(c.name.slice("popup_".length)))
    .filter((n) => Number.isFinite(n));

  const [sections, mainBanners, popups] = await Promise.all([
    getHomeSections(config, memberDiscountPct),
    getMainBanners(device),
    getActivePopups(device, dismissedPopupUids),
  ]);

  return (
    <>
      <PopupLayer popups={popups} />
      <MainRollingBanner banners={mainBanners.MAINT ?? []} device={device} />

      <div id="contents">
        {device === "pc" && (
          <MainBannerCenter mainCL={mainBanners.MAINCL ?? []} mainCR={mainBanners.MAINCR ?? []} />
        )}

        <HomeSections sections={sections} device={device} />
      </div>
    </>
  );
}
