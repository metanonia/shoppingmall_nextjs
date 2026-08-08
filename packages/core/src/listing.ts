import { Prisma, prisma } from "@shoppingmall/db";
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

export type GoodsSoldoutMode = 0 | 1 | 2;

const SOLD_OUT_WHERE: Prisma.GoodsWhereInput = {
  OR: [
    { qty_type: 0, qty: 0, option_use: 0 },
    { option_soldout: 2 },
    { sale_use: 0 },
  ],
};

export function isGoodsSoldOut(goods: { qty_type: number; qty: number; option_use: number; option_soldout: number; sale_use: number }) {
  return (goods.qty_type === 0 && goods.qty === 0 && goods.option_use === 0) || goods.option_soldout === 2 || goods.sale_use === 0;
}

export function goodsWhereForSoldout(where: Prisma.GoodsWhereInput, mode: GoodsSoldoutMode): Prisma.GoodsWhereInput {
  return mode === 2 ? { AND: [where, { NOT: SOLD_OUT_WHERE }] } : where;
}

export async function getGoodsSoldoutMode(): Promise<GoodsSoldoutMode> {
  const row = await prisma.configuration.findUnique({ where: { uid: 1 }, select: { goods_soldout: true } });
  return row?.goods_soldout === 1 || row?.goods_soldout === 2 ? row.goods_soldout : 0;
}

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

// Port of php/list.php / search.php's successive "결과 내 검색" conditions.
// Every whitespace-delimited term must match one of the legacy searchable
// product fields; spaces inside names are ignored like REPLACE(name,' ','').
export function keywordWhere(keyword: string | undefined) {
  const terms = (keyword ?? "").trim().split(/\s+/).map((term) => term.replace(/\s/g, "")).filter(Boolean);
  if (terms.length === 0) return {};
  return {
    AND: terms.map((term) => ({
      OR: [
        { name: { contains: term } },
        { name_code_able: { contains: term } },
        { goods_code: { contains: term } },
        { keyword: { contains: term } },
      ],
    })),
  };
}

export async function runGoodsQuery(
  where: NonNullable<Parameters<typeof prisma.goods.findMany>[0]>["where"],
  sort: SortOption,
  page: number,
  limit: number,
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
  memberDiscountPct = 0,
): Promise<GoodsListResult> {
  const soldoutMode = await getGoodsSoldoutMode();
  const effectiveWhere = goodsWhereForSoldout(where ?? {}, soldoutMode);
  const total = await prisma.goods.count({ where: effectiveWhere });
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);

  let rows = await prisma.goods.findMany({
    where: effectiveWhere,
    orderBy: sortToOrderBy(sort),
    ...(soldoutMode === 1 ? {} : { skip: (safePage - 1) * limit, take: limit }),
  });

  // MySQL's legacy query prepends the computed `sold_out ASC` field. Prisma
  // cannot order by this expression, so preserve the requested DB order and
  // stably partition before applying pagination.
  if (soldoutMode === 1) {
    rows = [
      ...rows.filter((row) => !isGoodsSoldOut(row)),
      ...rows.filter((row) => isGoodsSoldOut(row)),
    ].slice((safePage - 1) * limit, safePage * limit);
  }

  return {
    items: rows.map((row) => toGoodsCard(row, eventDiscounts, priceLimitConfig, memberDiscountPct)),
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
  memberDiscountPct = 0,
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
    memberDiscountPct,
  );
}

// Port of php/search.php's keyword search (name/goods_code match, no category scope).
export async function getGoodsListBySearch(
  opts: { keyword: string; sort: SortOption; page: number; limit: number },
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
  memberDiscountPct = 0,
): Promise<GoodsListResult> {
  return runGoodsQuery(
    { ...VISIBLE_GOODS_WHERE, ...keywordWhere(opts.keyword) },
    opts.sort,
    opts.page,
    opts.limit,
    eventDiscounts,
    priceLimitConfig,
    memberDiscountPct,
  );
}

// Port of php/new.php: main1_display3 (main "신상품" flag) OR main2_display3
// (per-category "신상품" flag), default sort re_uid ASC (newest uid first).
export async function getNewGoodsList(
  opts: { sort: SortOption; page: number; limit: number; keyword?: string },
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
  memberDiscountPct = 0,
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
    memberDiscountPct,
  );
}

// Port of php/best.php: rank by order-line count over the trailing 7 days,
// then pad with the ordinary all-time popularity order while excluding the
// products already selected by the weekly ranking.
export async function getBestSellingGoodsList(
  limit: number,
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
  memberDiscountPct = 0,
): Promise<GoodsCardViewModel[]> {
  const since = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
  const weekly = await prisma.orderGoods.groupBy({
    by: ["g_uid"],
    where: { reals: 1, status: { lt: 8 }, signdate: { gt: since } },
    _count: { g_uid: true },
    orderBy: { _count: { g_uid: "desc" } },
    take: limit,
  });
  const weeklyIds = weekly.map((row) => row.g_uid);
  const weeklyRows = weeklyIds.length > 0
    ? await prisma.goods.findMany({ where: { ...VISIBLE_GOODS_WHERE, uid: { in: weeklyIds } } })
    : [];
  const weeklyByUid = new Map(weeklyRows.map((row) => [row.uid, row]));
  const rankedRows = weeklyIds.map((uid) => weeklyByUid.get(uid)).filter((row): row is NonNullable<typeof row> => Boolean(row));

  const fallbackRows = await prisma.goods.findMany({
    where: { ...VISIBLE_GOODS_WHERE, ...(rankedRows.length > 0 ? { uid: { notIn: rankedRows.map((row) => row.uid) } } : {}) },
    orderBy: [{ order_priority: "asc" }, { order_cnt: "desc" }, { view_cnt: "desc" }],
    take: Math.max(0, limit - rankedRows.length),
  });
  const rows = [...rankedRows, ...fallbackRows];
  return rows.map((row) => toGoodsCard(row, eventDiscounts, priceLimitConfig, memberDiscountPct));
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
