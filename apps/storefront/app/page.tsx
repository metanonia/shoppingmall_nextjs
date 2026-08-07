import {
  getBankAccounts,
  getHomeSections,
  getMainBanners,
  getTopBanners,
  getTopLevelCategories,
  getTopMenu,
} from "@shoppingmall/core";
import { getCachedShopConfig, getDevice } from "@/lib/request";
import { TopNavPC } from "@/components/TopNavPC";
import { TopNavMobile } from "@/components/TopNavMobile";
import { MainBannerCenter, MainRollingBanner } from "@/components/MainBanners";
import { HomeSections } from "@/components/HomeSections";
import { Footer } from "@/components/Footer";

// Port of index.php's overall page assembly for `channel=main`
// (header.html -> php/top.php -> php/main.php -> commonBannerCheck('main') ->
// php/bottom.php), scoped to the Phase 1 vertical slice: home page content
// end-to-end against live data, PC and mobile, no login/cart/admin.
export default async function HomePage() {
  const device = await getDevice();
  const config = await getCachedShopConfig();

  const [sections, topBanners, mainBanners, categories] = await Promise.all([
    getHomeSections(config),
    getTopBanners(device),
    getMainBanners(device),
    getTopLevelCategories(),
  ]);

  const topMenu = getTopMenu(device === "mobile" ? config.mobileTopMenu : config.designTopMenu);
  const bankAccounts = getBankAccounts(config);

  return (
    <>
      {device === "mobile" ? (
        <TopNavMobile
          logo={topBanners.LOGO ?? []}
          topMenu={topMenu}
          categories={categories}
          compTel={config.compTel}
        />
      ) : (
        <TopNavPC
          logo={topBanners.LOGO ?? []}
          topBanner={topBanners.TOPL ?? []}
          topMenu={topMenu}
          categories={categories}
        />
      )}

      <MainRollingBanner banners={mainBanners.MAINT ?? []} device={device} />

      <div id="contents">
        {device === "pc" && (
          <MainBannerCenter mainCL={mainBanners.MAINCL ?? []} mainCR={mainBanners.MAINCR ?? []} />
        )}

        <HomeSections sections={sections} device={device} />
      </div>

      <div className="empty40" />

      <Footer config={config} bankAccounts={bankAccounts} device={device} />
    </>
  );
}
