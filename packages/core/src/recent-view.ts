import { prisma } from "@shoppingmall/db";
import type { ShopConfig } from "./config";
import { type GoodsCardViewModel, toGoodsCard } from "./goods";
import { getActiveEventDiscounts, priceLimitConfigFrom } from "./listing";

const RECENT_VIEW_LIMIT = 30;

function startOfTodayUnix(): number {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

// Port of php/view.php's recent-view + once-per-viewer/day view counter.
export async function recordGoodsView(checkId: string, goodsUid: number, vendor: string, mobile: boolean): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await prisma.$transaction(async (tx) => {
    const existing = await tx.goodsRecentView.findUnique({ where: { check_id_g_uid: { check_id: checkId, g_uid: goodsUid } } });
    if (existing) {
      await tx.goodsRecentView.update({ where: { uid: existing.uid }, data: { signdate: now } });
    } else {
      const count = await tx.goodsRecentView.count({ where: { check_id: checkId } });
      if (count >= RECENT_VIEW_LIMIT) {
        const oldest = await tx.goodsRecentView.findFirst({ where: { check_id: checkId }, orderBy: { signdate: "asc" } });
        if (oldest) await tx.goodsRecentView.delete({ where: { uid: oldest.uid } });
      }
      await tx.goodsRecentView.create({ data: { check_id: checkId, g_uid: goodsUid, signdate: now } });
    }

    const viewedToday = await tx.goodsView.count({
      where: { check_id: checkId, g_uid: goodsUid, signdate: { gt: startOfTodayUnix() } },
    });
    if (viewedToday === 0) {
      await tx.goods.updateMany({ where: { uid: goodsUid }, data: { view_cnt: { increment: 1 } } });
      await tx.goodsView.create({ data: { check_id: checkId, g_uid: goodsUid, vendor, mobile: mobile ? "Y" : "N", signdate: now } });
    }
  });
}

export async function mergeGuestRecentViewsOnLogin(guestCheckId: string, memberId: string): Promise<void> {
  const rows = await prisma.goodsRecentView.findMany({ where: { check_id: guestCheckId }, orderBy: { signdate: "asc" } });
  for (const row of rows) {
    await prisma.goodsRecentView.upsert({
      where: { check_id_g_uid: { check_id: memberId, g_uid: row.g_uid } },
      update: { signdate: row.signdate },
      create: { check_id: memberId, g_uid: row.g_uid, signdate: row.signdate },
    });
  }
  await prisma.goodsRecentView.deleteMany({ where: { check_id: guestCheckId } });
  const overflow = await prisma.goodsRecentView.findMany({
    where: { check_id: memberId }, orderBy: { signdate: "desc" }, skip: RECENT_VIEW_LIMIT, select: { uid: true },
  });
  if (overflow.length) await prisma.goodsRecentView.deleteMany({ where: { uid: { in: overflow.map((row) => row.uid) } } });
}

export async function getRecentViewedGoods(checkId: string, config: ShopConfig): Promise<GoodsCardViewModel[]> {
  const history = await prisma.goodsRecentView.findMany({ where: { check_id: checkId }, orderBy: { signdate: "desc" } });
  if (!history.length) return [];
  const rows = await prisma.goods.findMany({ where: { uid: { in: history.map((item) => item.g_uid) } } });
  const byUid = new Map(rows.map((row) => [row.uid, row]));
  const discounts = await getActiveEventDiscounts();
  const priceConfig = priceLimitConfigFrom(config);
  return history.map((item) => byUid.get(item.g_uid)).filter((row): row is NonNullable<typeof row> => Boolean(row)).map((row) => toGoodsCard(row, discounts, priceConfig));
}

export async function deleteRecentViewedGoods(checkId: string, goodsUid: number): Promise<void> {
  await prisma.goodsRecentView.deleteMany({ where: { check_id: checkId, g_uid: goodsUid } });
}
