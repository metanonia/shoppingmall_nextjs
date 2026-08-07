import { prisma } from "@shoppingmall/db";
import { type GoodsCardViewModel, toGoodsCard } from "./goods";
import { getActiveEventDiscounts, priceLimitConfigFrom } from "./listing";
import type { ShopConfig } from "./config";

const MAX_FAVORITES = 100;

// Port of php/favorite_goods_json.php / favorite_store_json.php's toggle:
// SELECT count(*) first, INSERT if absent else DELETE. No unique index exists
// on (id, g_uid) / (id, vendor) in legacy either — this mirrors the same
// application-level check-then-write, not a stronger guarantee.
export async function toggleFavoriteGoods(memberId: string, goodsUid: number, vendor: string): Promise<boolean> {
  const existing = await prisma.favoriteGoods.findFirst({ where: { id: memberId, g_uid: goodsUid } });
  if (existing) {
    await prisma.favoriteGoods.delete({ where: { uid: existing.uid } });
    return false;
  }

  const count = await prisma.favoriteGoods.count({ where: { id: memberId } });
  if (count >= MAX_FAVORITES) {
    const oldest = await prisma.favoriteGoods.findFirst({ where: { id: memberId }, orderBy: { uid: "asc" } });
    if (oldest) await prisma.favoriteGoods.delete({ where: { uid: oldest.uid } });
  }

  await prisma.favoriteGoods.create({
    data: { id: memberId, g_uid: goodsUid, vendor, signdate: Math.floor(Date.now() / 1000) },
  });
  return true;
}

export async function toggleFavoriteStore(memberId: string, vendor: string): Promise<boolean> {
  const existing = await prisma.favoriteStore.findFirst({ where: { id: memberId, vendor } });
  if (existing) {
    await prisma.favoriteStore.delete({ where: { uid: existing.uid } });
    return false;
  }

  const count = await prisma.favoriteStore.count({ where: { id: memberId } });
  if (count >= MAX_FAVORITES) {
    const oldest = await prisma.favoriteStore.findFirst({ where: { id: memberId }, orderBy: { uid: "asc" } });
    if (oldest) await prisma.favoriteStore.delete({ where: { uid: oldest.uid } });
  }

  await prisma.favoriteStore.create({
    data: { id: memberId, vendor, signdate: Math.floor(Date.now() / 1000) },
  });
  return true;
}

export async function isFavoriteGoods(memberId: string, goodsUid: number): Promise<boolean> {
  const row = await prisma.favoriteGoods.findFirst({ where: { id: memberId, g_uid: goodsUid } });
  return Boolean(row);
}

export async function isFavoriteStore(memberId: string, vendor: string): Promise<boolean> {
  const row = await prisma.favoriteStore.findFirst({ where: { id: memberId, vendor } });
  return Boolean(row);
}

export async function getFavoriteGoodsCount(goodsUid: number): Promise<number> {
  return prisma.favoriteGoods.count({ where: { g_uid: goodsUid } });
}

export async function getFavoriteStoreCount(vendor: string): Promise<number> {
  return prisma.favoriteStore.count({ where: { vendor } });
}

// Port of php/my_favorite_goods.php — no pagination in legacy either, just
// every favorited product for this member, newest first.
export async function getMyFavoriteGoods(memberId: string, config: ShopConfig): Promise<GoodsCardViewModel[]> {
  const favorites = await prisma.favoriteGoods.findMany({ where: { id: memberId }, orderBy: { uid: "desc" } });
  if (favorites.length === 0) return [];

  const eventDiscounts = await getActiveEventDiscounts();
  const priceLimitConfig = priceLimitConfigFrom(config);
  const rows = await prisma.goods.findMany({ where: { uid: { in: favorites.map((f) => f.g_uid) } } });
  const byUid = new Map(rows.map((r) => [r.uid, r]));

  return favorites
    .map((f) => byUid.get(f.g_uid))
    .filter((g): g is NonNullable<typeof g> => Boolean(g))
    .map((g) => toGoodsCard(g, eventDiscounts, priceLimitConfig));
}

export type FavoriteStoreItem = { vendor: string; storeName: string };

// Port of php/my_favorite_store.php, without the per-vendor top-6-goods
// enrichment (that's the same "인기상품" widget detail.ts's vendorGoods
// already implements — rendered separately per store here, not inline).
export async function getMyFavoriteStores(memberId: string): Promise<FavoriteStoreItem[]> {
  const favorites = await prisma.favoriteStore.findMany({ where: { id: memberId }, orderBy: { uid: "desc" } });
  if (favorites.length === 0) return [];

  const vendors = await prisma.vendor.findMany({
    where: { id: { in: favorites.map((f) => f.vendor) } },
    select: { id: true, comp_name: true },
  });
  const byId = new Map(vendors.map((v) => [v.id, v.comp_name]));

  return favorites
    .filter((f) => byId.has(f.vendor))
    .map((f) => ({ vendor: f.vendor, storeName: byId.get(f.vendor) ?? f.vendor }));
}
