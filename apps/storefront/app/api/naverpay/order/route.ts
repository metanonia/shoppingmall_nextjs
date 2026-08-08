import { NextResponse } from "next/server";
import { getNaverPayProduct, getNaverPayShipping, naverPayReady, requestNaverPayOrder } from "@shoppingmall/core";
import { getCachedShopConfig } from "@/lib/request";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new NextResponse("Invalid origin", { status: 403 });
  const form = await request.formData();
  const uid = Number(form.get("uid"));
  const optionUid = Number(form.get("optionUid") ?? 0);
  const qty = Math.max(1, Number(form.get("qty") ?? 1));
  const config = await getCachedShopConfig();
  if (!naverPayReady(config)) return new NextResponse("네이버페이가 설정되지 않았습니다.", { status: 404 });
  const baseUrl = (config.basicUrl || new URL(request.url).origin).replace(/\/$/, "");
  const product = await getNaverPayProduct(uid, optionUid, qty, baseUrl);
  if (!product) return new NextResponse("주문할 수 없는 상품 또는 옵션입니다.", { status: 400 });
  try {
    const result = await requestNaverPayOrder(config, [product], getNaverPayShipping(product, config), `${baseUrl}/goods/${uid}`);
    return NextResponse.redirect(`${result.orderUrl}?${new URLSearchParams({ ORDER_ID: result.orderId, SHOP_ID: result.shopId, TOTAL_PRICE: String(result.totalPrice) })}`, 303);
  } catch {
    return new NextResponse("네이버페이 주문서 생성에 실패했습니다.", { status: 502 });
  }
}
