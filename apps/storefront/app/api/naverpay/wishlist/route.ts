import { NextResponse } from "next/server";
import { getNaverPayProduct, naverPayReady, requestNaverPayWishlist } from "@shoppingmall/core";
import { getCachedShopConfig } from "@/lib/request";

export async function GET(request: Request) {
  const uid = Number(new URL(request.url).searchParams.get("uid"));
  const config = await getCachedShopConfig();
  if (!naverPayReady(config)) return new NextResponse("네이버페이가 설정되지 않았습니다.", { status: 404 });
  const baseUrl = (config.basicUrl || new URL(request.url).origin).replace(/\/$/, "");
  const product = await getNaverPayProduct(uid, 0, 1, baseUrl, false);
  if (!product) return new NextResponse("상품을 찾을 수 없습니다.", { status: 404 });
  try { return NextResponse.redirect(await requestNaverPayWishlist(config, product), 303); }
  catch { return new NextResponse("네이버페이 찜 등록에 실패했습니다.", { status: 502 }); }
}
