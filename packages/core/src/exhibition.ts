import { prisma } from "@shoppingmall/db";
import { type GoodsCardViewModel, toGoodsCard } from "./goods";
import { VISIBLE_GOODS_WHERE, type GoodsListResult } from "./listing";
import type { EventDiscountMap, PriceLimitConfig } from "./pricing";

export type ExhibitionListItem = {
  uid: number;
  name: string;
  image: string | null;
  statusLabel: string;
  dateRange: string | null;
};

const STATUS_LABEL: Record<number, string> = { 0: "-", 1: "준비중", 2: "진행중", 3: "종료" };

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Port of php/exhibition_list.php — a simple gallery of all exhibitions
// (any status), each with a status badge and, if discount_yn='Y', the
// discount window's date range.
export async function getExhibitionList(page: number, limit: number): Promise<{ items: ExhibitionListItem[]; total: number; totalPages: number; page: number }> {
  const total = await prisma.exhibition.count();
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const rows = await prisma.exhibition.findMany({
    orderBy: { uid: "asc" },
    skip: (safePage - 1) * limit,
    take: limit,
  });

  const items = rows.map((row) => ({
    uid: row.uid,
    name: row.name,
    image: row.image1 ? `/image/goods/${row.image1}` : null,
    statusLabel: STATUS_LABEL[row.status] ?? "-",
    dateRange: row.discount_yn === "Y" ? `${formatDate(row.s_date ?? new Date(0))} ~ ${formatDate(row.e_date ?? new Date(0))}` : null,
  }));

  return { items, total, totalPages, page: safePage };
}

export type ExhibitionDetail = {
  uid: number;
  name: string;
  explainsHtml: string;
  ended: boolean;
  groups: { ecate: number; name: string; goods: GoodsCardViewModel[] }[] | null;
  flatGoods: GoodsListResult | null;
};

// Port of php/exhibition.php. cate_info encodes optional sub-collections
// within the exhibition (`cate_max_num > 100` branch) — grouped goods by
// `ecate` when configured, otherwise a flat paginated list joined through
// mallRN_exhibition_goods (sorted by its `sequence` column).
export async function getExhibitionDetail(
  uid: number,
  page: number,
  limit: number,
  eventDiscounts: EventDiscountMap,
  priceLimitConfig: PriceLimitConfig,
  memberDiscountPct = 0,
): Promise<ExhibitionDetail | null> {
  const row = await prisma.exhibition.findFirst({ where: { uid } });
  if (!row) return null;

  const ended = row.discount_yn === "Y" && row.status === 3;

  const cateInfo = row.cate_info ? row.cate_info.split("|*|") : [];
  const cateMaxNum = Number(cateInfo[0] ?? 0);

  let groups: ExhibitionDetail["groups"] = null;
  let flatGoods: ExhibitionDetail["flatGoods"] = null;

  if (cateMaxNum > 100) {
    const cateEntries = cateInfo.slice(1).map((entry) => {
      const [num, name] = entry.split("|");
      return { ecate: Number(num), name };
    });

    groups = [];
    for (const entry of cateEntries) {
      const links = await prisma.exhibitionGoods.findMany({
        where: { euid: uid, ecate: entry.ecate },
        orderBy: { sequence: "asc" },
      });
      const rows = await prisma.goods.findMany({
        where: { ...VISIBLE_GOODS_WHERE, uid: { in: links.map((l) => l.guid) } },
      });
      const byUid = new Map(rows.map((r) => [r.uid, r]));
      const goods = links
        .map((l) => byUid.get(l.guid))
        .filter((g): g is NonNullable<typeof g> => Boolean(g))
        .map((g) => toGoodsCard(g, eventDiscounts, priceLimitConfig, memberDiscountPct));
      groups.push({ ecate: entry.ecate, name: entry.name, goods });
    }
  } else {
    const links = await prisma.exhibitionGoods.findMany({ where: { euid: uid }, orderBy: { sequence: "asc" } });
    const guids = links.map((l) => l.guid);
    const total = guids.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const pageGuids = guids.slice((safePage - 1) * limit, (safePage - 1) * limit + limit);

    const rows = await prisma.goods.findMany({ where: { ...VISIBLE_GOODS_WHERE, uid: { in: pageGuids } } });
    const byUid = new Map(rows.map((r) => [r.uid, r]));
    const items = pageGuids
      .map((g) => byUid.get(g))
      .filter((g): g is NonNullable<typeof g> => Boolean(g))
      .map((g) => toGoodsCard(g, eventDiscounts, priceLimitConfig, memberDiscountPct));

    flatGoods = { items, total, totalPages, page: safePage, limit };
  }

  return {
    uid: row.uid,
    name: row.name,
    explainsHtml: row.explains,
    ended,
    groups,
    flatGoods,
  };
}
