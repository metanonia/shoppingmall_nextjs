import type { MetadataRoute } from "next";
import {
  getSitemapBoardPosts,
  getSitemapCategories,
  getSitemapExhibitions,
  getSitemapGoods,
  getSitemapStores,
  getShopConfig,
} from "@shoppingmall/core";

const STATIC_PATHS = ["/", "/best", "/new", "/cs_center", "/agreement", "/privacy", "/exhibition_list"];

// Port of php/sitemap.php.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const config = await getShopConfig();
  const baseUrl = (config.basicUrl || process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000").replace(/\/$/, "");

  const [goods, categories, stores, exhibitions, boardPosts] = await Promise.all([
    getSitemapGoods(),
    getSitemapCategories(),
    getSitemapStores(),
    getSitemapExhibitions(),
    getSitemapBoardPosts(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({ url: `${baseUrl}${path}`, changeFrequency: "daily", priority: path === "/" ? 1 : 0.5 }));

  const dynamicEntries = [...categories, ...stores, ...exhibitions, ...boardPosts, ...goods].map((entry) => ({
    url: `${baseUrl}${entry.path}`,
    lastModified: entry.lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...dynamicEntries];
}
