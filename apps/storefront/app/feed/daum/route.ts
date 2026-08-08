import { NextResponse } from "next/server";
import { getShopConfig, getShoppingFeedItems } from "@shoppingmall/core";
import { buildShoppingFeedXml } from "@/lib/shopping-feed-xml";

// Port of plugin/engine/daum.php — off by default (goods_engine_daum=0,
// settings/goods H6).
export async function GET(): Promise<NextResponse> {
  const config = await getShopConfig();
  if (!config.goodsEngineDaum) return new NextResponse("", { status: 404 });

  const baseUrl = (config.basicUrl || process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000").replace(/\/$/, "");
  const items = await getShoppingFeedItems();
  const xml = buildShoppingFeedXml(config.basicName, baseUrl, items);
  return new NextResponse(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
