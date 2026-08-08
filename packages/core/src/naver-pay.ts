import { prisma } from "@shoppingmall/db";
import type { ShopConfig } from "./config";

export type NaverPayOrderItem = { id: string; name: string; count: number; option: string; unitPrice: number; totalPrice: number };

export type NaverPayProduct = NaverPayOrderItem & {
  uid: number;
  image: string;
  thumb: string;
  url: string;
  description: string;
  quantity: number;
  category: { id: string; name: string }[];
  options: { name: string; values: string[] }[];
  deliveryType: number;
  deliveryPrice: number;
};

export function naverPayReady(config: ShopConfig) {
  return config.naverPayUsed && Boolean(config.naverPayShopId && config.naverPayCertKey);
}

export async function getNaverPayProduct(uid: number, optionUid: number, count: number, baseUrl: string, requireOption = true): Promise<NaverPayProduct | null> {
  const goods = await prisma.goods.findFirst({ where: { uid, display_use: 1, auth_ck: "Y" } });
  if (!goods || goods.sale_use === 0 || count < 1) return null;
  let option = "";
  let optionPrice = 0;
  let quantity = goods.qty_type === 0 ? goods.qty : 99999;
  if (goods.option_use === 1) {
    const row = optionUid > 0 ? await prisma.goodsOption.findFirst({ where: { uid: optionUid, guid: uid, used: 1 } }) : null;
    if (!row && requireOption) return null;
    if (row) {
      option = row.value.replaceAll("|", " / ");
      optionPrice = row.price;
      quantity = row.qty_type === 0 ? row.qty : 99999;
    } else {
      const available = await prisma.goodsOption.findMany({ where: { guid: uid, used: 1 }, select: { qty_type: true, qty: true } });
      quantity = available.some((item) => item.qty_type !== 0) ? 99999 : available.reduce((sum, item) => sum + item.qty, 0);
    }
  }
  if (quantity < count) return null;
  const unitPrice = goods.price + optionPrice;
  const allCategories = await prisma.cate.findMany({ where: { used: 1 }, select: { cate: true, cate_name: true, cate_parent: true } });
  const byId = new Map(allCategories.map((row) => [row.cate.toString(), row]));
  const category: { id: string; name: string }[] = [];
  let categoryId = goods.cate.toString();
  while (categoryId && categoryId !== "0") {
    const row = byId.get(categoryId);
    if (!row) break;
    category.unshift({ id: categoryId, name: row.cate_name });
    categoryId = row.cate_parent.toString();
  }
  const options = goods.option_info.split("|*|").map((group) => {
    const [name, values = ""] = group.split("|");
    return { name, values: values.split(",").map((value) => value.trim()).filter(Boolean) };
  }).filter((group) => group.name);
  const origin = baseUrl.replace(/\/$/, "");
  const text = goods.detail.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() || "-";
  return {
    uid,
    id: `SHOP_${uid}`,
    name: goods.name,
    count,
    option,
    unitPrice,
    totalPrice: unitPrice * count,
    image: goods.image1 ? `${origin}/image/goods/${goods.image1}` : `${origin}/image/no_image.png`,
    thumb: goods.image3 ? `${origin}/image/goods/${goods.image3}` : `${origin}/image/no_image.png`,
    url: `${origin}/goods/${uid}`,
    description: text,
    quantity,
    category,
    options,
    deliveryType: goods.delivery_type,
    deliveryPrice: goods.delivery_price,
  };
}

export function getNaverPayShipping(product: Pick<NaverPayProduct, "deliveryType" | "deliveryPrice" | "count" | "totalPrice">, config: ShopConfig) {
  if (product.deliveryType === 2) return { type: "FREE", price: 0 };
  if (product.deliveryType === 3) return { type: "CASH_ON_DELIVERY", price: 0 };
  if (product.deliveryType === 4) return { type: "PAYED", price: product.deliveryPrice };
  if (product.deliveryType === 5) return { type: "PAYED", price: product.deliveryPrice * product.count };
  if (config.deliveryType === "F") return { type: "FREE", price: 0 };
  if (config.deliveryType === "D") return { type: "CASH_ON_DELIVERY", price: 0 };
  const price = product.totalPrice < config.deliveryPPrice1 ? config.deliveryPPrice2 : 0;
  return { type: price ? "PAYED" : "FREE", price };
}

export async function requestNaverPayOrder(config: ShopConfig, items: NaverPayOrderItem[], shipping: { type: string; price: number }, backUrl: string) {
  if (!naverPayReady(config) || !items.length) throw new Error("NAVER_PAY_NOT_CONFIGURED");
  const body = new URLSearchParams({ SHOP_ID: config.naverPayShopId, CERTI_KEY: config.naverPayCertKey });
  for (const item of items) {
    body.append("ITEM_ID", item.id); body.append("ITEM_NAME", item.name); body.append("ITEM_COUNT", String(item.count));
    body.append("ITEM_OPTION", item.option); body.append("ITEM_TPRICE", String(item.totalPrice)); body.append("ITEM_UPRICE", String(item.unitPrice));
  }
  body.set("SHIPPING_TYPE", shipping.type); body.set("SHIPPING_PRICE", String(shipping.price)); body.set("BACK_URL", backUrl);
  body.set("TOTAL_PRICE", String(items.reduce((sum, item) => sum + item.totalPrice, shipping.price)));
  const host = config.naverPayMode === 0 ? "test-pay.naver.com" : "pay.naver.com";
  const response = await fetch(`https://${host}/customer/api/order.nhn`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" }, body, cache: "no-store" });
  const orderId = (await response.text()).trim();
  if (!response.ok || !orderId) throw new Error(`NAVER_PAY_ORDER_${response.status}`);
  return { orderId, shopId: config.naverPayShopId, totalPrice: Number(body.get("TOTAL_PRICE")), orderUrl: `https://${host}/customer/order.nhn` };
}

export async function requestNaverPayWishlist(config: ShopConfig, product: NaverPayProduct) {
  if (!naverPayReady(config)) throw new Error("NAVER_PAY_NOT_CONFIGURED");
  const body = new URLSearchParams({ SHOP_ID: config.naverPayShopId, CERTI_KEY: config.naverPayCertKey, ITEM_ID: product.id, ITEM_NAME: product.name, ITEM_UPRICE: String(product.unitPrice), ITEM_IMAGE: product.image, ITEM_THUMB: product.thumb, ITEM_URL: product.url });
  const host = config.naverPayMode === 0 ? "test-pay.naver.com" : "pay.naver.com";
  const response = await fetch(`https://${host}/customer/api/wishlist.nhn`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" }, body, cache: "no-store" });
  const itemId = (await response.text()).trim();
  if (!response.ok || !itemId) throw new Error(`NAVER_PAY_WISHLIST_${response.status}`);
  return `https://${host}/customer/wishlistPopup.nhn?${new URLSearchParams({ SHOP_ID: config.naverPayShopId, ITEM_ID: itemId })}`;
}
