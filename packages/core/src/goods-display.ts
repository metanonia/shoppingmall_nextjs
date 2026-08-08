import { prisma } from "@shoppingmall/db";

// Port of managers/goods/goods_display.php's write side (main1/main2) and
// vendor/goods/goods_display.php's (store) — the read side for
// main1(홈 메인 진열)/main2(카테고리별 메인 진열) already existed (home.ts's
// getHomeSections() has read Goods.main1_display*/main2_display* since
// Phase 1) but nothing ever wrote to those flags; store(입점사 스토어 진열)
// had neither side wired. "분류상품진열"(GoodsCate.sequence1-4) is still
// excluded: category listing order already has an established
// simplification (Goods.order_priority, Phase 7) and adding a second,
// unwired ordering mechanism would just be dead weight.
export type DisplaySlot = "main1" | "main2" | "store";
export type DisplaySubSlot = 1 | 2 | 3;

function displayFields(slot: DisplaySlot, sub: DisplaySubSlot) {
  if (slot === "main1") {
    if (sub === 1) return { flag: "main1_display1", seq: "main1_display1_sequence" } as const;
    if (sub === 2) return { flag: "main1_display2", seq: "main1_display2_sequence" } as const;
    return { flag: "main1_display3", seq: "main1_display3_sequence" } as const;
  }
  if (slot === "main2") {
    if (sub === 1) return { flag: "main2_display1", seq: "main2_display1_sequence" } as const;
    if (sub === 2) return { flag: "main2_display2", seq: "main2_display2_sequence" } as const;
    return { flag: "main2_display3", seq: "main2_display3_sequence" } as const;
  }
  if (sub === 1) return { flag: "store_display1", seq: "store_display1_sequence" } as const;
  if (sub === 2) return { flag: "store_display2", seq: "store_display2_sequence" } as const;
  return { flag: "store_display3", seq: "store_display3_sequence" } as const;
}

export type DisplayGoodsItem = { uid: number; name: string; price: number; image1: string; sequence: number };

// main2(분류메인진열) is per-category (`cate` required); store(입점사 스토어
// 진열) is per-vendor (`vendorId` required, also enforces that a vendor's
// admin screen can only ever see/reorder their own products); main1(홈 메인)
// is shop-wide (neither needed).
export async function getDisplayGoodsList(
  slot: DisplaySlot,
  sub: DisplaySubSlot,
  opts: { cate?: bigint; vendorId?: string } = {},
): Promise<DisplayGoodsItem[]> {
  const f = displayFields(slot, sub);
  const rows = await prisma.goods.findMany({
    where: { [f.flag]: 1, ...(opts.cate !== undefined ? { cate: opts.cate } : {}), ...(opts.vendorId !== undefined ? { vendor: opts.vendorId } : {}) },
    orderBy: { [f.seq]: "asc" },
  });
  return rows.map((r) => ({ uid: r.uid, name: r.name, price: r.price, image1: r.image1, sequence: r[f.seq] }));
}

export type DisplayResult = { ok: true } | { ok: false; error: string };

export async function addGoodsToDisplay(slot: DisplaySlot, sub: DisplaySubSlot, goodsUid: number, vendorId?: string): Promise<DisplayResult> {
  const f = displayFields(slot, sub);
  const goods = await prisma.goods.findFirst({ where: { uid: goodsUid, ...(vendorId !== undefined ? { vendor: vendorId } : {}) } });
  if (!goods) return { ok: false, error: "존재하지 않거나 권한이 없는 상품입니다." };

  const top = await prisma.goods.findFirst({
    where: { [f.flag]: 1, [f.seq]: { lt: 99999 }, ...(vendorId !== undefined ? { vendor: vendorId } : {}) },
    orderBy: { [f.seq]: "desc" },
  });
  const nextSeq = top ? top[f.seq] + 1 : 1;
  await prisma.goods.update({ where: { uid: goodsUid }, data: { [f.flag]: 1, [f.seq]: nextSeq } });
  return { ok: true };
}

export async function removeGoodsFromDisplay(slot: DisplaySlot, sub: DisplaySubSlot, goodsUid: number, vendorId?: string): Promise<DisplayResult> {
  const f = displayFields(slot, sub);
  const updated = await prisma.goods.updateMany({
    where: { uid: goodsUid, ...(vendorId !== undefined ? { vendor: vendorId } : {}) },
    data: { [f.flag]: 0, [f.seq]: 99999 },
  });
  if (updated.count === 0) return { ok: false, error: "존재하지 않거나 권한이 없는 상품입니다." };
  return { ok: true };
}

// Takes the full ordered uid list for this slot (as shown by
// getDisplayGoodsList) and re-numbers sequences 1..N to match — the admin
// screen submits the whole reordered list rather than one move at a time.
export async function reorderDisplayGoods(slot: DisplaySlot, sub: DisplaySubSlot, uids: number[], vendorId?: string): Promise<DisplayResult> {
  const f = displayFields(slot, sub);
  if (vendorId !== undefined) {
    const owned = await prisma.goods.count({ where: { uid: { in: uids }, vendor: vendorId } });
    if (owned !== uids.length) return { ok: false, error: "권한이 없는 상품이 포함되어 있습니다." };
  }
  await prisma.$transaction(uids.map((uid, i) => prisma.goods.update({ where: { uid }, data: { [f.seq]: i + 1 } })));
  return { ok: true };
}
