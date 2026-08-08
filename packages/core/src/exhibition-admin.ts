import { prisma } from "@shoppingmall/db";

function now(): number {
  return Math.floor(Date.now() / 1000);
}

export type ExhibitionFormInput = {
  name: string;
  discountYn: "Y" | "N";
  discount: number;
  sDate: Date | null;
  eDate: Date | null;
  image1: string;
  detailImages: string[];
  detailImageOnly: boolean;
  detailImageType: 1 | 2;
  explains: string;
  status: number;
};

function toExhibitionData(input: ExhibitionFormInput) {
  return {
    name: input.name,
    discount_yn: input.discountYn,
    discount: input.discount,
    s_date: input.sDate,
    e_date: input.eDate,
    image1: input.image1,
    detail_image: input.detailImages.filter(Boolean).join(","),
    detail_image_only: input.detailImageOnly ? 1 : 0,
    detail_image_type: input.detailImageType,
    explains: input.explains,
    status: input.status,
  };
}

export async function createExhibition(input: ExhibitionFormInput): Promise<{ ok: true; uid: number } | { ok: false; error: string }> {
  if (!input.name.trim()) return { ok: false, error: "기획전명을 입력해 주세요." };
  const created = await prisma.exhibition.create({ data: { ...toExhibitionData(input), signdate: now() } });
  return { ok: true, uid: created.uid };
}

export async function updateExhibition(uid: number, input: ExhibitionFormInput): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.name.trim()) return { ok: false, error: "기획전명을 입력해 주세요." };
  const updated = await prisma.exhibition.updateMany({ where: { uid }, data: toExhibitionData(input) });
  if (updated.count === 0) return { ok: false, error: "존재하지 않는 기획전입니다." };
  return { ok: true };
}

// V1 only supports the flat goods list (legacy's cate_info sub-grouping,
// `cate_max_num > 100` in exhibition.ts, isn't supported for writes yet —
// see MIGRATION.md).
export async function addExhibitionGoods(euid: number, guid: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const goods = await prisma.goods.findFirst({ where: { uid: guid } });
  if (!goods) return { ok: false, error: "존재하지 않는 상품입니다." };

  const existing = await prisma.exhibitionGoods.findFirst({ where: { euid, guid } });
  if (existing) return { ok: false, error: "이미 추가된 상품입니다." };

  const maxSeq = await prisma.exhibitionGoods.aggregate({ _max: { sequence: true }, where: { euid } });
  await prisma.exhibitionGoods.create({ data: { euid, guid, ecate: 0, sequence: (maxSeq._max.sequence ?? 0) + 1 } });
  return { ok: true };
}

export async function removeExhibitionGoods(uid: number): Promise<void> {
  await prisma.exhibitionGoods.deleteMany({ where: { uid } });
}

// Sets sequence 1..N in the given order — drives the admin's up/down reorder
// controls (see reorderGoodsDisplay's comment in goods-admin for why this
// repo uses simple numeric-input reordering instead of legacy's drag-drop
// AJAX endpoint).
export async function reorderExhibitionGoods(euid: number, orderedUids: number[]): Promise<void> {
  await prisma.$transaction(orderedUids.map((uid, i) => prisma.exhibitionGoods.updateMany({ where: { uid, euid }, data: { sequence: i + 1 } })));
}

export type AdminExhibitionGoodsItem = { uid: number; goodsUid: number; goodsName: string; sequence: number };

export type AdminExhibitionDetail = ExhibitionFormInput & { uid: number; goods: AdminExhibitionGoodsItem[] };

export async function getAdminExhibitionDetail(uid: number): Promise<AdminExhibitionDetail | null> {
  const row = await prisma.exhibition.findFirst({ where: { uid } });
  if (!row) return null;
  const links = await prisma.exhibitionGoods.findMany({ where: { euid: uid }, orderBy: { sequence: "asc" } });
  const goodsRows = await prisma.goods.findMany({ where: { uid: { in: links.map((l) => l.guid) } } });
  const byUid = new Map(goodsRows.map((g) => [g.uid, g]));

  return {
    uid: row.uid,
    name: row.name,
    discountYn: row.discount_yn,
    discount: row.discount,
    sDate: row.s_date,
    eDate: row.e_date,
    image1: row.image1,
    detailImages: row.detail_image.split(",").filter(Boolean),
    detailImageOnly: row.detail_image_only === 1,
    detailImageType: row.detail_image_type === 2 ? 2 : 1,
    explains: row.explains,
    status: row.status,
    goods: links.map((l) => ({ uid: l.uid, goodsUid: l.guid, goodsName: byUid.get(l.guid)?.name ?? "(삭제된 상품)", sequence: l.sequence })),
  };
}

export type AdminExhibitionListItem = { uid: number; name: string; status: number; goodsCount: number };

export async function getAdminExhibitionList(): Promise<AdminExhibitionListItem[]> {
  const rows = await prisma.exhibition.findMany({ orderBy: { uid: "desc" } });
  const counts = await prisma.exhibitionGoods.groupBy({ by: ["euid"], _count: { uid: true } });
  const countByEuid = new Map(counts.map((c) => [c.euid, c._count.uid]));
  return rows.map((r) => ({ uid: r.uid, name: r.name, status: r.status, goodsCount: countByEuid.get(r.uid) ?? 0 }));
}
