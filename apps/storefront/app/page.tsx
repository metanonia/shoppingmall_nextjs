import { getHomeSections, getMainBanners } from "@shoppingmall/core";
import { getCachedShopConfig, getDevice } from "@/lib/request";
import { MainBannerCenter, MainRollingBanner } from "@/components/MainBanners";
import { HomeSections } from "@/components/HomeSections";

// Port of php/main.php + commonBannerCheck('main'), scoped to the Phase 1
// vertical slice. Nav/footer chrome now lives in app/layout.tsx (every
// channel wraps its content in the same header/top/bottom, per index.php).
export default async function HomePage() {
  const device = await getDevice();
  const config = await getCachedShopConfig();

  const [sections, mainBanners] = await Promise.all([getHomeSections(config), getMainBanners(device)]);

  return (
    <>
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
