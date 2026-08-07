import {
  getActiveEventDiscounts,
  getGoodsListBySearch,
  priceLimitConfigFrom,
  type SortOption,
} from "@shoppingmall/core";
import { getCachedShopConfig, getDevice } from "@/lib/request";
import { GoodsGrid } from "@/components/GoodsGrid";
import { ListingControls } from "@/components/ListingControls";
import { Pagination } from "@/components/Pagination";

const VALID_SORTS: SortOption[] = ["best", "new", "price_asc", "price_desc"];

// Port of php/search.php. Multi-term "결과 내 검색" narrowing (successive
// ANDed keywords) is simplified to a single search phrase — see listing.ts.
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const keyword = (Array.isArray(params.keyword) ? params.keyword[0] : params.keyword) ?? "";
  const sort = VALID_SORTS.includes(params.sort as SortOption) ? (params.sort as SortOption) : "best";
  const limit = Number(params.limit) || 12;
  const page = Number(params.page) || 1;

  const [device, config] = await Promise.all([getDevice(), getCachedShopConfig()]);
  const eventDiscounts = await getActiveEventDiscounts();

  const result = keyword
    ? await getGoodsListBySearch({ keyword, sort, page, limit }, eventDiscounts, priceLimitConfigFrom(config))
    : { items: [], total: 0, page: 1, totalPages: 1, limit };

  const makeHref = (p: number) =>
    `/search?keyword=${encodeURIComponent(keyword)}&sort=${sort}&limit=${limit}&page=${p}`;

  return (
    <div id="contents">
      <div className="empty20" />
      <div className="secCateName">&apos;{keyword}&apos; 검색결과</div>
      <div className="empty30" />

      <ListingControls total={result.total} />
      <div className="empty20" />
      <GoodsGrid
        goods={result.items}
        device={device}
        emptyMessage={keyword ? "검색 결과가 없습니다." : "검색어를 입력해 주세요."}
      />
      <div className="paging">
        <Pagination page={result.page} totalPages={result.totalPages} makeHref={makeHref} />
      </div>
    </div>
  );
}
