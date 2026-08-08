import { prisma } from "@shoppingmall/db";
import { getDescendantCateIds, keywordWhere, runGoodsQuery, VISIBLE_GOODS_WHERE, type GoodsListResult, type SortOption } from "./listing";
import type { EventDiscountMap, PriceLimitConfig } from "./pricing";
import { getFavoriteStoreCount } from "./favorite";
import { displayType, type GoodsSection } from "./home";
import { toGoodsCard } from "./goods";

export type StoreInfo = {
  vendorId: string;
  storeName: string;
  compName: string;
  compOwner: string;
  compTel: string;
  compFax: string;
  compEmail: string;
  compLicenseNo: string;
  compAddress: string;
  csTime1: string;
  csTime2: string;
  csTime3: string;
  csTime4: string;
  favoriteCount: number;
  reviewCount: number;
  starsAvg: string;
};

// Port of php/store.php. CS hours use this vendor's mallRN_vendor_configuration
// row (Phase 8's /vendor/store settings screen) when they've set one up;
// falls back to shop-wide-looking defaults otherwise, same as legacy does for
// a vendor who never configured their own settings. Review stars are still
// hardcoded to zero: mallRN_review needs an order to point at (see
// detail.ts) — favorite-store count is now real (mallRN_favorite_store,
// added alongside member auth).
export async function getStoreInfo(vendorId: string): Promise<StoreInfo | null> {
  const [vendor, config] = await Promise.all([
    prisma.vendor.findFirst({ where: { id: vendorId, sell: { not: "N" } } }),
    prisma.vendorConfiguration.findFirst({ where: { vendor: vendorId } }),
  ]);
  if (!vendor) return null;

  return {
    vendorId,
    storeName: vendor.comp_name,
    compName: vendor.comp_name,
    compOwner: vendor.comp_owner,
    compTel: vendor.comp_tel,
    compFax: vendor.comp_fax,
    compEmail: vendor.comp_email,
    compLicenseNo: vendor.comp_license_no,
    compAddress: `${vendor.comp_address1} ${vendor.comp_address2}`.trim(),
    csTime1: config?.basic_cs_time1 || "09:00 ~ 18:00",
    csTime2: config?.basic_cs_time2 || "휴무",
    csTime3: config?.basic_cs_time3 || "휴무",
    csTime4: config?.basic_cs_time4 || "12:00 ~ 13:00",
    favoriteCount: await getFavoriteStoreCount(vendorId),
    reviewCount: 0,
    starsAvg: "0.0",
  };
}

export type StoreCategoryCount = { cate: string; name: string; count: number; children: StoreCategoryCount[] };

// Port of php/store.php:263-293's category-with-product-count sidebar,
// scoped to this vendor's own products.
export async function getStoreCategories(vendorId: string): Promise<StoreCategoryCount[]> {
  const topRows = await prisma.cate.findMany({ where: { cate_dep: 1, used: 1 }, orderBy: { sequence: "asc" } });

  async function countFor(cate: bigint): Promise<number> {
    const cateIds = await getDescendantCateIds(cate);
    return prisma.goods.count({
      where: { ...VISIBLE_GOODS_WHERE, vendor: vendorId, cate: { in: cateIds } },
    });
  }

  const result: StoreCategoryCount[] = [];
  for (const row of topRows) {
    const count = await countFor(row.cate);
    if (count === 0) continue;

    const children: StoreCategoryCount[] = [];
    if (row.cate_sub === 1) {
      const subRows = await prisma.cate.findMany({ where: { cate_parent: row.cate, used: 1 }, orderBy: { sequence: "asc" } });
      for (const sub of subRows) {
        const subCount = await countFor(sub.cate);
        if (subCount > 0) children.push({ cate: sub.cate.toString(), name: sub.cate_name, count: subCount, children: [] });
      }
    }

    result.push({ cate: row.cate.toString(), name: row.cate_name, count, children });
  }

  return result;
}

// Port of php/store.php's main goods grid (mallRN_goods WHERE vendor = ...).
export async function getStoreGoodsList(
  vendorId: string,
  opts: { cate?: bigint; sort: SortOption; page: number; limit: number; keyword?: string },
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
  memberDiscountPct = 0,
): Promise<GoodsListResult> {
  let cateFilter = {};
  if (opts.cate) {
    const cateIds = await getDescendantCateIds(opts.cate);
    cateFilter = { cate: { in: cateIds } };
  }

  return runGoodsQuery(
    { ...VISIBLE_GOODS_WHERE, vendor: vendorId, ...cateFilter, ...keywordWhere(opts.keyword) },
    opts.sort,
    opts.page,
    opts.limit,
    eventDiscounts,
    priceLimitConfig,
    memberDiscountPct,
  );
}

// store_display{1,2,3} / store_display{1,2,3}_sequence are three physically
// distinct columns — same reason home.ts's MAIN1_DISPLAY_WHERE/ORDER are
// split by slot instead of interpolating a field name.
const STORE_DISPLAY_WHERE = {
  1: { store_display1: 1 as const },
  2: { store_display2: 1 as const },
  3: { store_display3: 1 as const },
};
const STORE_DISPLAY_ORDER = {
  1: { store_display1_sequence: "asc" as const },
  2: { store_display2_sequence: "asc" as const },
  3: { store_display3_sequence: "asc" as const },
};
const STORE_SECTION_KEYS = { 1: "best", 2: "reco", 3: "new" } as const;

// Port of php/store.php's reco/best/new highlight sections — mirrors
// home.ts's getGoodsSection exactly, scoped to this vendor's own products
// and driven by VendorConfiguration.design_main_display{1,2,3} (added
// Phase 8) instead of the shop-wide Configuration row. This was left
// unwired since Phase 2 (store.ts's own comment cited "no vendor
// site-settings table yet" — stale by the time Phase 8 added one).
export async function getStoreSections(
  vendorId: string,
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
  memberDiscountPct = 0,
): Promise<GoodsSection[]> {
  const config = await prisma.vendorConfiguration.findFirst({ where: { vendor: vendorId } });
  if (!config) return [];

  const sections: GoodsSection[] = [];
  for (const slot of [1, 2, 3] as const) {
    const displayValue = slot === 1 ? config.design_main_display1 : slot === 2 ? config.design_main_display2 : config.design_main_display3;
    if (displayValue === 0) continue;

    const rows = await prisma.goods.findMany({
      where: { ...VISIBLE_GOODS_WHERE, vendor: vendorId, ...STORE_DISPLAY_WHERE[slot] },
      orderBy: STORE_DISPLAY_ORDER[slot],
    });
    if (rows.length === 0) continue;

    sections.push({
      kind: "goods",
      key: STORE_SECTION_KEYS[slot],
      displayType: displayType(displayValue),
      goods: rows.map((row) => toGoodsCard(row, eventDiscounts, priceLimitConfig, memberDiscountPct)),
    });
  }
  return sections;
}
