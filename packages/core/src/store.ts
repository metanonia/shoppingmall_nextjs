import { prisma } from "@shoppingmall/db";
import { getDescendantCateIds, keywordWhere, runGoodsQuery, VISIBLE_GOODS_WHERE, type GoodsListResult, type SortOption } from "./listing";
import type { EventDiscountMap, PriceLimitConfig } from "./pricing";
import { getFavoriteStoreCount } from "./favorite";

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

// Port of php/store.php. mallRN_vendor_configuration (per-vendor site
// settings — custom CS hours, custom display order) doesn't exist yet — see
// packages/db/sql/002_phase2_tables.sql — so this always falls back to
// shop-wide defaults the same way legacy does for a vendor who hasn't
// configured their own settings. Review stars are still hardcoded to zero:
// mallRN_review needs an order to point at (see detail.ts) — favorite-store
// count is now real (mallRN_favorite_store, added alongside member auth).
export async function getStoreInfo(vendorId: string): Promise<StoreInfo | null> {
  const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, sell: { not: "N" } } });
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
    csTime1: "09:00 ~ 18:00",
    csTime2: "휴무",
    csTime3: "휴무",
    csTime4: "12:00 ~ 13:00",
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
// The per-vendor "reco/best/new" highlight sections (store_display1/2/3,
// driven by mallRN_vendor_configuration.design_main_display_order) are out
// of scope for the same reason as getStoreInfo — no vendor site-settings
// table yet.
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
