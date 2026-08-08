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

export type DashboardWidgetKey = "todayOrderCount" | "todaySalesTotal" | "unansweredCounselCount";
export type WidgetLayoutItem = { key: DashboardWidgetKey; visible: boolean };

const DEFAULT_WIDGET_LAYOUT: WidgetLayoutItem[] = [
  { key: "todayOrderCount", visible: true },
  { key: "todaySalesTotal", visible: true },
  { key: "unansweredCounselCount", visible: true },
];
const WIDGET_KEYS = DEFAULT_WIDGET_LAYOUT.map((w) => w.key);

// Port of managers/index.php's per-admin 위젯배치(mallRN_admin_configuration.
// widget_info) — legacy has ~20 widgets to reorder/toggle; this repo's
// dashboard only ever had the 3 above (an already-reviewed simplification,
// see migration_deferred_items), so this is a show/hide + explicit-order
// control over those 3 rather than a drag-and-drop grid, matching this
// repo's established precedent (DisplayReorderForm etc.) of substituting
// legacy's drag-drop admin UIs with simpler explicit controls.
export async function getWidgetLayout(adminId: string): Promise<WidgetLayoutItem[]> {
  const row = await prisma.adminConfiguration.findFirst({ where: { id: adminId } });
  if (!row?.widget_info) return DEFAULT_WIDGET_LAYOUT;

  try {
    const saved = JSON.parse(row.widget_info) as WidgetLayoutItem[];
    const byKey = new Map(saved.filter((w) => WIDGET_KEYS.includes(w.key)).map((w) => [w.key, w.visible]));
    // Any widget key added after an admin last saved (or a corrupt row)
    // falls back to visible=true rather than disappearing silently.
    return saved.filter((w) => WIDGET_KEYS.includes(w.key)).length > 0
      ? WIDGET_KEYS.filter((k) => byKey.has(k))
          .map((k) => ({ key: k, visible: byKey.get(k)! }))
          .concat(WIDGET_KEYS.filter((k) => !byKey.has(k)).map((k) => ({ key: k, visible: true })))
      : DEFAULT_WIDGET_LAYOUT;
  } catch {
    return DEFAULT_WIDGET_LAYOUT;
  }
}

export async function updateWidgetLayout(adminId: string, layout: WidgetLayoutItem[]): Promise<void> {
  const widget_info = JSON.stringify(layout.filter((w) => WIDGET_KEYS.includes(w.key)));
  const existing = await prisma.adminConfiguration.findFirst({ where: { id: adminId } });
  if (existing) await prisma.adminConfiguration.update({ where: { uid: existing.uid }, data: { widget_info } });
  else await prisma.adminConfiguration.create({ data: { id: adminId, widget_info } });
}
