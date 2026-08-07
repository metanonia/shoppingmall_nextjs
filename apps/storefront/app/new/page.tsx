import {
  getActiveEventDiscounts,
  getNewGoodsList,
  priceLimitConfigFrom,
  type SortOption,
} from "@shoppingmall/core";
import { getCachedShopConfig, getDevice } from "@/lib/request";
import { GoodsGrid } from "@/components/GoodsGrid";
import { ListingControls } from "@/components/ListingControls";
import { Pagination } from "@/components/Pagination";

const VALID_SORTS: SortOption[] = ["best", "new", "price_asc", "price_desc"];

// Port of php/new.php: products flagged for the "신상품" slot, newest first by default.
export default async function NewGoodsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sort = VALID_SORTS.includes(params.sort as SortOption) ? (params.sort as SortOption) : "new";
  const limit = Number(params.limit) || 12;
  const page = Number(params.page) || 1;
  const keyword = Array.isArray(params.keyword) ? params.keyword[0] : params.keyword;

  const [device, config] = await Promise.all([getDevice(), getCachedShopConfig()]);
  const eventDiscounts = await getActiveEventDiscounts();
  const result = await getNewGoodsList(
    { sort, page, limit, keyword },
    eventDiscounts,
    priceLimitConfigFrom(config),
  );

  const makeHref = (p: number) =>
    `/new?sort=${sort}&limit=${limit}${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""}&page=${p}`;

  return (
    <div id="contents">
      <div className="empty20" />
      <div className="secCateName">신상품</div>
      <div className="empty30" />

      <ListingControls total={result.total} />
      <div className="empty20" />
      <GoodsGrid goods={result.items} device={device} />
      <div className="paging">
        <Pagination page={result.page} totalPages={result.totalPages} makeHref={makeHref} />
      </div>
    </div>
  );
}
