import { prisma } from "@shoppingmall/db";

// Port of managers/goods/goods_display.php's write side. The read side for
// main1(홈 메인 진열)/main2(카테고리별 메인 진열) already exists —
// home.ts's getHomeSections() has been reading Goods.main1_display*/
// main2_display* since Phase 1 — but nothing ever wrote to those flags,
// meaning the homepage's 인기/추천/신상품 sections could only ever be
// empty. "분류상품진열"(type 3, GoodsCate.sequence1-4) and vendor
// store_display* aren't included here: category listing order already has
// an established simplification (Goods.order_priority, Phase 7) and
// store_display* was explicitly scoped out in store.ts's own Phase 8
// comment — adding a second, unwired ordering mechanism for either would
// just be dead weight.
export type MainDisplaySlot = "main1" | "main2";
export type DisplaySubSlot = 1 | 2 | 3;

function displayFields(slot: MainDisplaySlot, sub: DisplaySubSlot) {
  if (slot === "main1") {
    if (sub === 1) return { flag: "main1_display1", seq: "main1_display1_sequence" } as const;
    if (sub === 2) return { flag: "main1_display2", seq: "main1_display2_sequence" } as const;
    return { flag: "main1_display3", seq: "main1_display3_sequence" } as const;
  }
  if (sub === 1) return { flag: "main2_display1", seq: "main2_display1_sequence" } as const;
  if (sub === 2) return { flag: "main2_display2", seq: "main2_display2_sequence" } as const;
  return { flag: "main2_display3", seq: "main2_display3_sequence" } as const;
}

export type DisplayGoodsItem = { uid: number; name: string; price: number; image1: string; sequence: number };

// main2(분류메인진열) is per-category, so `cate` is required for that slot —
// main1(홈 메인) is shop-wide.
export async function getDisplayGoodsList(slot: MainDisplaySlot, sub: DisplaySubSlot, cate?: bigint): Promise<DisplayGoodsItem[]> {
  const f = displayFields(slot, sub);
  const rows = await prisma.goods.findMany({
    where: { [f.flag]: 1, ...(cate !== undefined ? { cate } : {}) },
    orderBy: { [f.seq]: "asc" },
  });
  return rows.map((r) => ({ uid: r.uid, name: r.name, price: r.price, image1: r.image1, sequence: r[f.seq] }));
}

export type DisplayResult = { ok: true } | { ok: false; error: string };

export async function addGoodsToDisplay(slot: MainDisplaySlot, sub: DisplaySubSlot, goodsUid: number): Promise<DisplayResult> {
  const f = displayFields(slot, sub);
  const goods = await prisma.goods.findFirst({ where: { uid: goodsUid } });
  if (!goods) return { ok: false, error: "존재하지 않는 상품입니다." };

  const top = await prisma.goods.findFirst({ where: { [f.flag]: 1, [f.seq]: { lt: 99999 } }, orderBy: { [f.seq]: "desc" } });
  const nextSeq = top ? top[f.seq] + 1 : 1;
  await prisma.goods.update({ where: { uid: goodsUid }, data: { [f.flag]: 1, [f.seq]: nextSeq } });
  return { ok: true };
}

export async function removeGoodsFromDisplay(slot: MainDisplaySlot, sub: DisplaySubSlot, goodsUid: number): Promise<DisplayResult> {
  const f = displayFields(slot, sub);
  const updated = await prisma.goods.updateMany({ where: { uid: goodsUid }, data: { [f.flag]: 0, [f.seq]: 99999 } });
  if (updated.count === 0) return { ok: false, error: "존재하지 않는 상품입니다." };
  return { ok: true };
}

// Takes the full ordered uid list for this slot (as shown by
// getDisplayGoodsList) and re-numbers sequences 1..N to match — the admin
// screen submits the whole reordered list rather than one move at a time.
export async function reorderDisplayGoods(slot: MainDisplaySlot, sub: DisplaySubSlot, uids: number[]): Promise<DisplayResult> {
  const f = displayFields(slot, sub);
  await prisma.$transaction(uids.map((uid, i) => prisma.goods.update({ where: { uid }, data: { [f.seq]: i + 1 } })));
  return { ok: true };
}
