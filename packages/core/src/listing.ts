import { prisma } from "@shoppingmall/db";
import type { ShopConfig } from "./config";
import { type GoodsCardViewModel, toGoodsCard } from "./goods";
import type { EventDiscountMap, PriceLimitConfig } from "./pricing";

export type SortOption = "best" | "new" | "price_asc" | "price_desc";

export type GoodsListResult = {
  items: GoodsCardViewModel[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
};

const DEFAULT_LIMIT = 12;

function sortToOrderBy(sort: SortOption) {
  switch (sort) {
    case "new":
      return [{ re_uid: "asc" as const }];
    case "price_asc":
      return [{ price: "asc" as const }];
    case "price_desc":
      return [{ price: "desc" as const }];
    default:
      return [{ order_priority: "asc" as const }, { order_cnt: "desc" as const }, { view_cnt: "desc" as const }];
  }
}

// Port of php/list.php / search.php's `INSTR(REPLACE(a.name, ' ', ''), '...')`
// keyword matching, simplified to a single search phrase against name/goods_code
// (legacy also ANDs successive "결과 내 검색" narrowing terms and matches the
// pipe-delimited `keyword` field — deferred, see the migration plan).
export function keywordWhere(keyword: string | undefined) {
  if (!keyword) return {};
  return {
    OR: [{ name: { contains: keyword } }, { goods_code: { contains: keyword } }],
  };
}

export async function runGoodsQuery(
  where: NonNullable<Parameters<typeof prisma.goods.findMany>[0]>["where"],
  sort: SortOption,
  page: number,
  limit: number,
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
): Promise<GoodsListResult> {
  const total = await prisma.goods.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const rows = await prisma.goods.findMany({
    where,
    orderBy: sortToOrderBy(sort),
    skip: (safePage - 1) * limit,
    take: limit,
  });

  return {
    items: rows.map((row) => toGoodsCard(row, eventDiscounts, priceLimitConfig)),
    total,
    page: safePage,
    totalPages,
    limit,
  };
}

export const VISIBLE_GOODS_WHERE = { display_use: 1, auth_ck: "Y" as const, cate_hide: 0, vendor_hide: 0 };

// Port of php/list.php's category listing query. Legacy matches descendants by
// string-slicing the zero-padded digit-segment `cate` code
// (`SUBSTRING(cate,1,i) = ...`); this walks the explicit cate_parent links
// mallRN_cate already has instead — same visible result (products in this
// category and its subcategories), without depending on a fragile numbering
// convention. Legacy also joins through mallRN_goods_cate (a product can be
// tagged into more than one category) rather than the single `goods.cate`
// column, which this mirrors.
export async function getDescendantCateIds(cate: bigint): Promise<bigint[]> {
  const all = [cate];
  let frontier = [cate];
  for (let depth = 0; depth < 4 && frontier.length > 0; depth++) {
    const children = await prisma.cate.findMany({
      where: { cate_parent: { in: frontier } },
      select: { cate: true },
    });
    if (children.length === 0) break;
    frontier = children.map((c) => c.cate);
    all.push(...frontier);
  }
  return all;
}

export async function getGoodsListByCategory(
  cate: bigint,
  opts: { sort: SortOption; page: number; limit: number; keyword?: string },
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
): Promise<GoodsListResult> {
  const cateIds = await getDescendantCateIds(cate);
  const taggedGuids = await prisma.goodsCate.findMany({
    where: { cate: { in: cateIds } },
    select: { guid: true },
    distinct: ["guid"],
  });
  const uids = taggedGuids.map((g) => g.guid);

  return runGoodsQuery(
    { ...VISIBLE_GOODS_WHERE, uid: { in: uids }, ...keywordWhere(opts.keyword) },
    opts.sort,
    opts.page,
    opts.limit,
    eventDiscounts,
    priceLimitConfig,
  );
}

// Port of php/search.php's keyword search (name/goods_code match, no category scope).
export async function getGoodsListBySearch(
  opts: { keyword: string; sort: SortOption; page: number; limit: number },
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
): Promise<GoodsListResult> {
  return runGoodsQuery(
    { ...VISIBLE_GOODS_WHERE, ...keywordWhere(opts.keyword) },
    opts.sort,
    opts.page,
    opts.limit,
    eventDiscounts,
    priceLimitConfig,
  );
}

// Port of php/new.php: main1_display3 (main "신상품" flag) OR main2_display3
// (per-category "신상품" flag), default sort re_uid ASC (newest uid first).
export async function getNewGoodsList(
  opts: { sort: SortOption; page: number; limit: number; keyword?: string },
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
): Promise<GoodsListResult> {
  return runGoodsQuery(
    {
      ...VISIBLE_GOODS_WHERE,
      OR: [{ main1_display3: 1 }, { main2_display3: 1 }],
      ...keywordWhere(opts.keyword),
    },
    opts.sort,
    opts.page,
    opts.limit,
    eventDiscounts,
    priceLimitConfig,
  );
}

// Port of php/best.php. Legacy ranks by order count over the trailing 7 days
// (mallRN_order_goods) and pads with an all-time popularity fallback; there is
// no order history yet (orders are Phase 4), so this only implements the
// fallback ranking — swap in the weekly-order-count query once orders exist.
export async function getBestSellingGoodsList(
  limit: number,
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
): Promise<GoodsCardViewModel[]> {
  const rows = await prisma.goods.findMany({
    where: VISIBLE_GOODS_WHERE,
    orderBy: [{ order_priority: "asc" }, { order_cnt: "desc" }, { view_cnt: "desc" }],
    take: limit,
  });
  return rows.map((row) => toGoodsCard(row, eventDiscounts, priceLimitConfig));
}

export async function getActiveEventDiscounts(): Promise<EventDiscountMap> {
  const rows = await prisma.exhibition.findMany({
    where: { status: 2, discount_yn: "Y", discount: { gt: 0 } },
    select: { uid: true, discount: true },
  });
  return new Map(rows.map((r) => [r.uid, r.discount]));
}

export function priceLimitConfigFrom(config: ShopConfig): PriceLimitConfig {
  return { goodsPriceLimit1: config.goodsPriceLimit1, goodsPriceLimit2: config.goodsPriceLimit2 };
}
