import { notFound } from "next/navigation";
import {
  getActiveEventDiscounts,
  getStoreCategories,
  getStoreGoodsList,
  getStoreInfo,
  getStoreSections,
  isFavoriteStore,
  priceLimitConfigFrom,
  type SortOption,
} from "@shoppingmall/core";
import { getCachedMemberDiscountPct, getCachedShopConfig, getDevice, getSiteChrome } from "@/lib/request";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreCategoryList } from "@/components/StoreCategoryList";
import { GoodsGrid } from "@/components/GoodsGrid";
import { ListingControls } from "@/components/ListingControls";
import { Pagination } from "@/components/Pagination";
import { HomeSections } from "@/components/HomeSections";

const VALID_SORTS: SortOption[] = ["best", "new", "price_asc", "price_desc"];

// Port of php/store.php + store_cate.php, merged into one route (?cate= is
// optional) — see the migration plan for why the two near-identical PHP
// files became one parameterized page instead of two.
export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const vendorId = Array.isArray(params.vendor) ? params.vendor[0] : params.vendor;
  if (!vendorId) notFound();

  const store = await getStoreInfo(vendorId);
  if (!store) notFound();

  const cateParam = Array.isArray(params.cate) ? params.cate[0] : params.cate;
  const cate = cateParam ? BigInt(cateParam) : undefined;
  const sort = VALID_SORTS.includes(params.sort as SortOption) ? (params.sort as SortOption) : "best";
  const limit = Number(params.limit) || 12;
  const page = Number(params.page) || 1;
  const keyword = Array.isArray(params.keyword) ? params.keyword[0] : params.keyword;

  const [device, config, categories, memberDiscountPct, { member }] = await Promise.all([
    getDevice(),
    getCachedShopConfig(),
    getStoreCategories(vendorId),
    getCachedMemberDiscountPct(),
    getSiteChrome(),
  ]);
  const isFavorited = member ? await isFavoriteStore(member.id, vendorId) : false;
  const eventDiscounts = await getActiveEventDiscounts();
  const result = await getStoreGoodsList(
    vendorId,
    { cate, sort, page, limit, keyword },
    eventDiscounts,
    priceLimitConfigFrom(config),
    memberDiscountPct,
  );
  // Highlight sections (reco/best/new) only make sense on the unfiltered
  // storefront landing view, not while browsing a category or searching.
  const sections = !cateParam && !keyword && page === 1
    ? await getStoreSections(vendorId, eventDiscounts, priceLimitConfigFrom(config), memberDiscountPct)
    : [];

  const makeHref = (p: number) =>
    `/store?vendor=${vendorId}${cateParam ? `&cate=${cateParam}` : ""}&sort=${sort}&limit=${limit}${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""}&page=${p}`;

  return (
    <div id="contents">
      <StoreHeader store={store} isMember={Boolean(member)} isFavorited={isFavorited} />
      <div className="empty40" />

      {sections.length > 0 && (
        <>
          <HomeSections sections={sections} device={device} />
          <div className="empty40" />
        </>
      )}

      {categories.length > 0 && <StoreCategoryList vendorId={vendorId} categories={categories} selectedCate={cateParam} />}

      <div className="empty40" />

      <ListingControls total={result.total} />
      <div className="empty20" />
      <GoodsGrid goods={result.items} device={device} />
      <div className="paging">
        <Pagination page={result.page} totalPages={result.totalPages} makeHref={makeHref} />
      </div>
    </div>
  );
}
