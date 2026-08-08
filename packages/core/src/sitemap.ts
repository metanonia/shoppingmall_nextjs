import { prisma } from "@shoppingmall/db";
import { VISIBLE_GOODS_WHERE } from "./listing";

// Port of php/sitemap.php — this repo has none of the legacy caching/paging
// concerns (the shop this ships with is small), so a single sitemap.ts is
// enough; if the catalog ever grows past ~50k URLs, Next's
// generateSitemaps() would need to paginate this instead.
export type SitemapEntry = { path: string; lastModified: Date };

function toDate(unixSeconds: number): Date {
  return unixSeconds > 0 ? new Date(unixSeconds * 1000) : new Date(0);
}

export async function getSitemapGoods(): Promise<SitemapEntry[]> {
  const rows = await prisma.goods.findMany({ where: VISIBLE_GOODS_WHERE, select: { uid: true, signdate: true } });
  return rows.map((r) => ({ path: `/goods/${r.uid}`, lastModified: toDate(r.signdate) }));
}

export async function getSitemapCategories(): Promise<SitemapEntry[]> {
  const rows = await prisma.cate.findMany({ where: { used: 1 }, select: { cate: true } });
  return rows.map((r) => ({ path: `/list?cate=${r.cate}`, lastModified: new Date(0) }));
}

export async function getSitemapStores(): Promise<SitemapEntry[]> {
  const rows = await prisma.vendor.findMany({ where: { sell: { not: "N" } }, select: { id: true, signdate: true } });
  return rows.map((r) => ({ path: `/store?vendor=${r.id}`, lastModified: toDate(r.signdate) }));
}

export async function getSitemapExhibitions(): Promise<SitemapEntry[]> {
  const rows = await prisma.exhibition.findMany({ select: { uid: true, signdate: true } });
  return rows.map((r) => ({ path: `/exhibition/${r.uid}`, lastModified: toDate(r.signdate) }));
}

const SITEMAP_BOARDS = ["notice", "faq", "gallery"] as const;

export async function getSitemapBoardPosts(): Promise<SitemapEntry[]> {
  const rows = await prisma.boardPost.findMany({
    where: { board: { in: [...SITEMAP_BOARDS] }, secret: 0 },
    select: { board: true, uid: true, signdate: true },
  });
  return rows.map((r) => ({ path: `/board/${r.board}/${r.uid}`, lastModified: toDate(r.signdate) }));
}
