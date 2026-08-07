import { notFound } from "next/navigation";
import {
  checkCateAccess,
  getActiveEventDiscounts,
  getGoodsListByCategory,
  getListCategoryChips,
  priceLimitConfigFrom,
  type SortOption,
} from "@shoppingmall/core";
import { getCachedShopConfig, getDevice } from "@/lib/request";
import { CategoryChips } from "@/components/CategoryChips";
import { GoodsGrid } from "@/components/GoodsGrid";
import { ListingControls } from "@/components/ListingControls";
import { Pagination } from "@/components/Pagination";

const VALID_SORTS: SortOption[] = ["best", "new", "price_asc", "price_desc"];

// Port of php/list.php + list.html/mobile_list.html: category browsing with
// sort/limit/pagination. The home-page-style "reco/best/new for this
// category" highlight sections (main.php's counterpart, main2_display*) are
// deferred — see the migration plan; this covers the core browse+paginate path.
export default async function ListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const cateParam = Array.isArray(params.cate) ? params.cate[0] : params.cate;
  if (!cateParam) notFound();

  const cate = BigInt(cateParam);
  const accessible = await checkCateAccess(cate);
  if (!accessible) notFound();

  const sort = VALID_SORTS.includes(params.sort as SortOption) ? (params.sort as SortOption) : "best";
  const limit = Number(params.limit) || 12;
  const page = Number(params.page) || 1;
  const keyword = Array.isArray(params.keyword) ? params.keyword[0] : params.keyword;

  const [device, config, chips] = await Promise.all([getDevice(), getCachedShopConfig(), getListCategoryChips(cate)]);
  const eventDiscounts = await getActiveEventDiscounts();
  const result = await getGoodsListByCategory(
    cate,
    { sort, page, limit, keyword },
    eventDiscounts,
    priceLimitConfigFrom(config),
  );

  const makeHref = (p: number) =>
    `/list?cate=${cateParam}&sort=${sort}&limit=${limit}${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""}&page=${p}`;

  return (
    <div id="contents">
      <div className="empty20" />
      <div className="secCateName">{chips.secCateName}</div>
      <div className="secCateLocation">{chips.location}</div>
      <div className="empty30" />

      <CategoryChips chips={chips.chips} />

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
