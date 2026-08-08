import { NextResponse } from "next/server";
import { getActiveEventDiscounts, getCartSummary, naverPayReady, priceLimitConfigFrom, requestNaverPayOrder } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";
import { getCartId } from "@/lib/cart-id";
import { getCachedMemberDiscountPct, getCachedShopConfig } from "@/lib/request";

export async function GET(request: Request) {
  const session = await getSession();
  const [config, memberDiscountPct] = await Promise.all([getCachedShopConfig(), getCachedMemberDiscountPct()]);
  if (!naverPayReady(config)) return new NextResponse("네이버페이가 설정되지 않았습니다.", { status: 404 });
  const cartId = await getCartId(session?.userId ?? null);
  const summary = await getCartSummary(cartId, false, config, await getActiveEventDiscounts(), priceLimitConfigFrom(config), memberDiscountPct);
  const lines = summary.lines.filter((line) => line.selected && !line.soldOut && !line.requiresOptionMissing);
  if (!lines.length) return new NextResponse("선택된 주문 가능 상품이 없습니다.", { status: 400 });
  const items = lines.map((line) => ({ id: `SHOP_${line.goodsUid}`, name: line.goodsName, count: line.qty, option: line.optionValue ?? "", unitPrice: line.unitPrice, totalPrice: line.lineTotal }));
  const shipping = { type: summary.deliveryTotal > 0 ? "PAYED" : lines.every((line) => line.deliveryType === 3) ? "CASH_ON_DELIVERY" : "FREE", price: summary.deliveryTotal };
  const baseUrl = (config.basicUrl || new URL(request.url).origin).replace(/\/$/, "");
  try {
    const result = await requestNaverPayOrder(config, items, shipping, `${baseUrl}/cart`);
    return NextResponse.redirect(`${result.orderUrl}?${new URLSearchParams({ ORDER_ID: result.orderId, SHOP_ID: result.shopId, TOTAL_PRICE: String(result.totalPrice) })}`, 303);
  } catch {
    return new NextResponse("네이버페이 주문서 생성에 실패했습니다.", { status: 502 });
  }
}
