import { prisma } from "@shoppingmall/db";

export type AdminDashboardStats = {
  todayOrderCount: number;
  todaySalesTotal: number;
  unansweredCounselCount: number;
};

function todayStartUnix(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor(now.getTime() / 1000);
}

// Scoped-down replacement for legacy's ~20-widget admin dashboard (see
// MIGRATION.md) — just the handful of numbers an admin checks first thing.
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const since = todayStartUnix();

  const [orders, unansweredCounselCount] = await Promise.all([
    prisma.orderInfo.findMany({ where: { reals: 1, signdate: { gte: since } }, select: { pay_total: true } }),
    prisma.boardPost.count({ where: { board: "counsel", comment_count: 0 } }),
  ]);

  return {
    todayOrderCount: orders.length,
    todaySalesTotal: orders.reduce((sum, o) => sum + o.pay_total, 0),
    unansweredCounselCount,
  };
}
