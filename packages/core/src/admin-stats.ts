import { prisma } from "@shoppingmall/db";

// Port of managers/order/margin_statistics*.php, managers/member/
// member_statistics*.php, managers/goods/goods_statistics_type.php,
// managers/member/mileage_statistics.php — scoped down from legacy in two
// ways documented once here rather than per-function:
//
// 1. No PC/Mobile split and no per-sales-type breakdown (상품/배송비/마일리지/
//    쿠폰/할인/CP수수료). Phase 8 deliberately redesigned `mallRN_order_sales`
//    to only track goods-line settlement (price/qty/commission per
//    OrderGoods row) rather than porting legacy's `mobile`/`type`/`status`
//    columns — re-adding them now just to power one statistics screen isn't
//    worth reopening that schema decision. These functions follow
//    order-admin.ts's `getSalesStats` precedent instead: fetch rows in the
//    date range, bucket/sum in JS rather than a dynamic SQL-string GROUP BY.
// 2. "클릭수"(product view/click count) ranking is dropped — this migration
//    has never had a page-view/click-log table at any phase, and building
//    one now solely for a ranking column would be new tracking
//    infrastructure, not a statistics port. 판매금액/판매수량/관심상품 rankings
//    are kept since OrderGoods/FavoriteGoods already carry that data.
// 3. member_statistics' "탈퇴" (withdrawal) time series is dropped —
//    withdrawMember() (member.ts) hard-deletes the row with no audit table
//    (a decision the completeness audit already reviewed and accepted), so
//    there's nothing to count. 휴면전환 uses MemberSleep.sleep_time instead.

function dateToUnix(dateStr: string, endOfDay = false): number {
  return Math.floor(new Date(`${dateStr}T${endOfDay ? "23:59:59" : "00:00:00"}`).getTime() / 1000);
}

function dateKey(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

export type MarginStatsPoint = { date: string; salesTotal: number; marginTotal: number };
export type MarginStatsResult = {
  points: MarginStatsPoint[];
  salesTotal: number;
  marginTotal: number;
  marginPct: number;
};

// Revenue = SUM(price*qty) of settled order-goods lines; margin = the
// commission cut already snapshotted per line at order time (order.ts's
// createOrder, commission_amount) — this is legacy's "마진"(margin), i.e.
// the shop's take, not the vendor's payout.
export async function getMarginStats(dateFrom: string, dateTo: string): Promise<MarginStatsResult> {
  const rows = await prisma.orderSales.findMany({
    where: { signdate: { gte: dateToUnix(dateFrom), lte: dateToUnix(dateTo, true) } },
    select: { signdate: true, price: true, qty: true, commission_amount: true },
  });

  const byDate = new Map<string, MarginStatsPoint>();
  for (const row of rows) {
    const key = dateKey(row.signdate);
    const point = byDate.get(key) ?? { date: key, salesTotal: 0, marginTotal: 0 };
    point.salesTotal += row.price * row.qty;
    point.marginTotal += row.commission_amount;
    byDate.set(key, point);
  }

  const points = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  const salesTotal = points.reduce((sum, p) => sum + p.salesTotal, 0);
  const marginTotal = points.reduce((sum, p) => sum + p.marginTotal, 0);
  return { points, salesTotal, marginTotal, marginPct: salesTotal > 0 ? Math.round((marginTotal / salesTotal) * 10000) / 100 : 0 };
}

export type MemberStatsPoint = { date: string; signupCount: number; sleepCount: number };
export type MemberStatsResult = {
  points: MemberStatsPoint[];
  totalSignupCount: number;
  totalSleepCount: number;
  currentSleepMemberCount: number;
};

export async function getMemberStats(dateFrom: string, dateTo: string): Promise<MemberStatsResult> {
  const from = dateToUnix(dateFrom);
  const to = dateToUnix(dateTo, true);

  const [signups, sleepConversions, currentSleepMemberCount] = await Promise.all([
    prisma.member.findMany({ where: { signdate: { gte: from, lte: to } }, select: { signdate: true } }),
    prisma.memberSleep.findMany({ where: { sleep_time: { gte: from, lte: to } }, select: { sleep_time: true } }),
    prisma.memberSleep.count(),
  ]);

  const byDate = new Map<string, MemberStatsPoint>();
  for (const row of signups) {
    const key = dateKey(row.signdate);
    const point = byDate.get(key) ?? { date: key, signupCount: 0, sleepCount: 0 };
    point.signupCount += 1;
    byDate.set(key, point);
  }
  for (const row of sleepConversions) {
    const key = dateKey(row.sleep_time);
    const point = byDate.get(key) ?? { date: key, signupCount: 0, sleepCount: 0 };
    point.sleepCount += 1;
    byDate.set(key, point);
  }

  const points = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  return {
    points,
    totalSignupCount: signups.length,
    totalSleepCount: sleepConversions.length,
    currentSleepMemberCount,
  };
}

export type GoodsRankingType = "sales" | "qty" | "favorite";
export type GoodsRankingItem = { uid: number; name: string; image1: string; value: number; pct: number };

const RANKING_LIMIT = 30;

export async function getGoodsRanking(dateFrom: string, dateTo: string, type: GoodsRankingType): Promise<GoodsRankingItem[]> {
  const from = dateToUnix(dateFrom);
  const to = dateToUnix(dateTo, true);

  const sums = new Map<number, number>();

  if (type === "favorite") {
    const rows = await prisma.favoriteGoods.findMany({ where: { signdate: { gte: from, lte: to } }, select: { g_uid: true } });
    for (const row of rows) sums.set(row.g_uid, (sums.get(row.g_uid) ?? 0) + 1);
  } else {
    const orderNums = await prisma.orderInfo.findMany({
      where: { reals: 1, signdate: { gte: from, lte: to } },
      select: { order_num: true },
    });
    if (orderNums.length > 0) {
      const rows = await prisma.orderGoods.findMany({
        where: { order_num: { in: orderNums.map((o) => o.order_num) } },
        select: { g_uid: true, price: true, qty: true },
      });
      for (const row of rows) {
        const value = type === "sales" ? row.price * row.qty : row.qty;
        sums.set(row.g_uid, (sums.get(row.g_uid) ?? 0) + value);
      }
    }
  }

  const ranked = Array.from(sums.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, RANKING_LIMIT);
  if (ranked.length === 0) return [];

  const goodsRows = await prisma.goods.findMany({ where: { uid: { in: ranked.map(([uid]) => uid) } }, select: { uid: true, name: true, image1: true } });
  const goodsByUid = new Map(goodsRows.map((g) => [g.uid, g]));
  const total = ranked.reduce((sum, [, v]) => sum + v, 0);

  return ranked.map(([uid, value]) => ({
    uid,
    name: goodsByUid.get(uid)?.name ?? "(삭제된 상품)",
    image1: goodsByUid.get(uid)?.image1 ?? "",
    value,
    pct: total > 0 ? Math.round((value / total) * 10000) / 100 : 0,
  }));
}

export type MileageStatsPoint = { date: string; accrued: number; used: number };
export type MileageStatsResult = { points: MileageStatsPoint[]; totalAccrued: number; totalUsed: number; net: number };

export async function getMileageStats(dateFrom: string, dateTo: string): Promise<MileageStatsResult> {
  const rows = await prisma.mileage.findMany({
    where: { deleted: 0, signdate: { gte: dateToUnix(dateFrom), lte: dateToUnix(dateTo, true) } },
    select: { signdate: true, mileage: true, use_mileage: true },
  });

  const byDate = new Map<string, MileageStatsPoint>();
  for (const row of rows) {
    const key = dateKey(row.signdate);
    const point = byDate.get(key) ?? { date: key, accrued: 0, used: 0 };
    if (row.mileage > 0) point.accrued += row.mileage;
    if (row.use_mileage > 0) point.used += row.use_mileage;
    byDate.set(key, point);
  }

  const points = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  const totalAccrued = points.reduce((sum, p) => sum + p.accrued, 0);
  const totalUsed = points.reduce((sum, p) => sum + p.used, 0);
  return { points, totalAccrued, totalUsed, net: totalAccrued - totalUsed };
}
