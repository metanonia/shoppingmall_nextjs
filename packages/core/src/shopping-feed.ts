import { prisma } from "@shoppingmall/db";
import { VISIBLE_GOODS_WHERE } from "./listing";

// Port of plugin/engine/naver.php + daum.php — legacy generates near-identical
// per-network XML from the same query (mallRN_goods WHERE engine_use=1),
// which this repo keeps as one shared item shape feeding two thin XML
// serializers (the storefront's app/feed/{naver,daum}/route.ts) rather than
// two parallel query implementations.
export type ShoppingFeedItem = {
  id: number;
  title: string;
  link: string;
  imageLink: string;
  price: number;
  categoryName: string;
};

export async function getShoppingFeedItems(): Promise<ShoppingFeedItem[]> {
  const rows = await prisma.goods.findMany({
    where: { ...VISIBLE_GOODS_WHERE, engine_use: 1 },
    select: { uid: true, name: true, image1: true, price: true, cate: true },
    orderBy: { uid: "asc" },
  });
  if (rows.length === 0) return [];

  const cateRows = await prisma.cate.findMany({ where: { cate: { in: rows.map((r) => r.cate) } }, select: { cate: true, cate_name: true } });
  const cateNameByCate = new Map(cateRows.map((c) => [c.cate, c.cate_name]));

  return rows.map((r) => ({
    id: r.uid,
    title: r.name,
    link: `/goods/${r.uid}`,
    imageLink: r.image1 ? `/image/goods/${r.image1}` : "/image/no_image.png",
    price: r.price,
    categoryName: cateNameByCate.get(r.cate) ?? "",
  }));
}
