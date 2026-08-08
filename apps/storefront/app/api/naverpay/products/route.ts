import { NextResponse } from "next/server";
import { getNaverPayProduct, naverPayReady } from "@shoppingmall/core";
import { getCachedShopConfig } from "@/lib/request";

const xml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const cdata = (value: string) => `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;

export async function GET(request: Request) {
  const config = await getCachedShopConfig();
  if (!naverPayReady(config)) return new NextResponse("", { status: 404 });
  const url = new URL(request.url);
  const ids = url.searchParams.getAll("ITEM_ID").map((id) => Number(id.replace(/^SHOP_/, ""))).filter(Number.isInteger);
  if (!ids.length) return new NextResponse("ITEM_ID is required", { status: 400 });
  const baseUrl = (config.basicUrl || url.origin).replace(/\/$/, "");
  const products = (await Promise.all(ids.map((uid) => getNaverPayProduct(uid, 0, 1, baseUrl, false)))).filter((item) => item !== null);
  const items = products.map((item) => `<item id="${xml(item.id)}"><name>${cdata(item.name)}</name><url>${cdata(item.url)}</url><description>${cdata(item.description)}</description><image>${cdata(item.image)}</image><thumb>${cdata(item.thumb)}</thumb><price>${item.unitPrice}</price><quantity>${item.quantity}</quantity><category>${item.category.slice(0, 4).map((category, index) => `<${["first", "second", "third", "fourth"][index]} id="${xml(category.id)}">${xml(category.name)}</${["first", "second", "third", "fourth"][index]}>`).join("")}</category><options>${item.options.map((option) => `<option name="${xml(option.name)}">${option.values.map((value) => `<select>${xml(value)}</select>`).join("")}</option>`).join("")}</options></item>`).join("");
  return new NextResponse(`<?xml version="1.0" encoding="utf-8"?><response>${items}</response>`, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store" } });
}
