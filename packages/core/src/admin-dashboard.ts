import { prisma } from "@shoppingmall/db";

export type AdminDashboardStats = {
  todayOrderCount: number;
  todaySalesTotal: number;
  unansweredCounselCount: number;
  unansweredInquiryCount: number;
  unansweredVendorCounselCount: number;
  activeOrderChangeCount: number;
  pendingCashReceiptCount: number;
  pendingGoodsCount: number;
  pendingVendorCount: number;
  memberCount: number;
  shippingCount: number;
  errorCount: number;
  todayGoodsCount: number;
  todayMemberCount: number;
  todayVisitorCount: number;
  todayMarginTotal: number;
  todayBoardCount: number;
  totalBoardCount: number;
  orderStepCounts: { status: number; today: number; total: number }[];
  recentOrders: { id: string; label: string }[];
  recentMembers: { id: string; label: string }[];
  recentInquiries: { id: string; label: string }[];
  recentCounsels: { id: string; label: string }[];
  recentReviews: { id: string; label: string }[];
  recentNotices: { id: string; label: string }[];
  recentFaqs: { id: string; label: string }[];
  recentVendorNotices: { id: string; label: string }[];
  recentVendorCounsels: { id: string; label: string }[];
};

function todayStartUnix(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor(now.getTime() / 1000);
}

// Port of managers/widget/*: headline totals, order steps, notices and the
// latest four rows for each operational queue.
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const since = todayStartUnix();

  const [orders, unansweredCounselCount, unansweredInquiryCount, unansweredVendorCounselCount, activeOrderChangeCount, pendingCashReceiptCount, pendingGoodsCount, pendingVendorCount, memberCount, shippingCount, errorCount, todayGoodsCount, todayMemberCount, visitors, todaySales, todayBoardCount, totalBoardCount, orderLines, recentOrders, recentMembers, recentInquiries, recentCounsels, recentReviews, recentNotices, recentFaqs, recentVendorNotices, recentVendorCounsels] = await Promise.all([
    prisma.orderInfo.findMany({ where: { reals: 1, signdate: { gte: since } }, select: { pay_total: true } }),
    prisma.boardPost.count({ where: { board: "counsel", comment_count: 0 } }),
    prisma.inquiry.count({ where: { answer: "" } }),
    prisma.boardPost.count({ where: { board: "vcounsel", comment_count: 0 } }),
    prisma.orderStatusChange.count({ where: { status2: { in: [1, 2, 3, 4] } } }),
    prisma.orderCashReceipt.count({ where: { status: 0 } }),
    prisma.goods.count({ where: { auth_ck: "N" } }),
    prisma.vendor.count({ where: { auth: "R" } }),
    prisma.member.count(),
    prisma.orderGoods.count({ where: { reals: 1, status: { in: [2, 3] } } }),
    prisma.dbErrorLog.count({ where: { status: 0 } }),
    prisma.goods.count({ where: { signdate: { gte: since } } }),
    prisma.member.count({ where: { signdate: { gte: since } } }),
    prisma.visitorEvent.findMany({ where: { signdate: { gte: since } }, distinct: ["visitor_key"], select: { visitor_key: true } }),
    prisma.orderSales.findMany({ where: { signdate: { gte: since } }, select: { commission_amount: true } }),
    prisma.boardPost.count({ where: { signdate: { gte: since } } }),
    prisma.boardPost.count(),
    prisma.orderGoods.findMany({ where: { reals: 1 }, select: { status: true, signdate: true } }),
    prisma.orderInfo.findMany({ where: { reals: 1 }, orderBy: { uid: "desc" }, take: 4, select: { order_num: true, name: true, pay_total: true } }),
    prisma.member.findMany({ orderBy: { uid: "desc" }, take: 4, select: { id: true, name: true } }),
    prisma.inquiry.findMany({ orderBy: { uid: "desc" }, take: 4, select: { uid: true, subject: true } }),
    prisma.boardPost.findMany({ where: { board: "counsel" }, orderBy: { uid: "desc" }, take: 4, select: { uid: true, subject: true } }),
    prisma.review.findMany({ orderBy: { uid: "desc" }, take: 4, select: { uid: true, g_name: true, name: true } }),
    prisma.boardPost.findMany({ where: { board: "notice" }, orderBy: { uid: "desc" }, take: 4, select: { uid: true, subject: true } }),
    prisma.boardPost.findMany({ where: { board: "faq" }, orderBy: { uid: "desc" }, take: 4, select: { uid: true, subject: true } }),
    prisma.boardPost.findMany({ where: { board: "vnotice" }, orderBy: { uid: "desc" }, take: 4, select: { uid: true, subject: true } }),
    prisma.boardPost.findMany({ where: { board: "vcounsel" }, orderBy: { uid: "desc" }, take: 4, select: { uid: true, subject: true } }),
  ]);

  const orderStepCounts = Array.from({ length: 7 }, (_, status) => ({
    status,
    today: orderLines.filter((line) => line.status === status && line.signdate >= since).length,
    total: orderLines.filter((line) => line.status === status).length,
  }));

  return {
    todayOrderCount: orders.length,
    todaySalesTotal: orders.reduce((sum, o) => sum + o.pay_total, 0),
    unansweredCounselCount,
    unansweredInquiryCount,
    unansweredVendorCounselCount,
    activeOrderChangeCount,
    pendingCashReceiptCount,
    pendingGoodsCount,
    pendingVendorCount,
    memberCount,
    shippingCount,
    errorCount,
    todayGoodsCount,
    todayMemberCount,
    todayVisitorCount: visitors.length,
    todayMarginTotal: todaySales.reduce((sum, row) => sum + row.commission_amount, 0),
    todayBoardCount,
    totalBoardCount,
    orderStepCounts,
    recentOrders: recentOrders.map((row) => ({ id: row.order_num, label: `${row.name} · ${row.pay_total.toLocaleString("ko-KR")}원` })),
    recentMembers: recentMembers.map((row) => ({ id: row.id, label: `${row.name} (${row.id})` })),
    recentInquiries: recentInquiries.map((row) => ({ id: String(row.uid), label: row.subject })),
    recentCounsels: recentCounsels.map((row) => ({ id: String(row.uid), label: row.subject })),
    recentReviews: recentReviews.map((row) => ({ id: String(row.uid), label: `${row.g_name} · ${row.name}` })),
    recentNotices: recentNotices.map((row) => ({ id: String(row.uid), label: row.subject })),
    recentFaqs: recentFaqs.map((row) => ({ id: String(row.uid), label: row.subject })),
    recentVendorNotices: recentVendorNotices.map((row) => ({ id: String(row.uid), label: row.subject })),
    recentVendorCounsels: recentVendorCounsels.map((row) => ({ id: String(row.uid), label: row.subject })),
  };
}

export type DashboardWidgetKey = "todayOrderCount" | "todaySalesTotal" | "todayGoodsCount" | "todayMemberCount" | "todayVisitorCount" | "todayMarginTotal" | "boardPostCount" | "orderStepCount" | "unansweredCounselCount" | "unansweredInquiryCount" | "unansweredVendorCounselCount" | "activeOrderChangeCount" | "pendingCashReceiptCount" | "pendingGoodsCount" | "pendingVendorCount" | "memberCount" | "shippingCount" | "errorCount" | "recentOrders" | "recentMembers" | "recentInquiries" | "recentCounsels" | "recentReviews" | "recentNotices" | "recentFaqs" | "recentVendorNotices" | "recentVendorCounsels" | "operatingTips";
export type WidgetLayoutItem = { key: DashboardWidgetKey; visible: boolean };

const DEFAULT_WIDGET_LAYOUT: WidgetLayoutItem[] = [
  { key: "todayOrderCount", visible: true },
  { key: "todaySalesTotal", visible: true },
  { key: "todayGoodsCount", visible: true },
  { key: "todayMemberCount", visible: true },
  { key: "todayVisitorCount", visible: true },
  { key: "todayMarginTotal", visible: true },
  { key: "boardPostCount", visible: true },
  { key: "orderStepCount", visible: true },
  { key: "unansweredCounselCount", visible: true },
  { key: "unansweredInquiryCount", visible: true },
  { key: "unansweredVendorCounselCount", visible: true },
  { key: "activeOrderChangeCount", visible: true },
  { key: "pendingCashReceiptCount", visible: true },
  { key: "pendingGoodsCount", visible: true },
  { key: "pendingVendorCount", visible: true },
  { key: "memberCount", visible: true },
  { key: "shippingCount", visible: true },
  { key: "errorCount", visible: true },
  { key: "recentOrders", visible: true },
  { key: "recentMembers", visible: true },
  { key: "recentInquiries", visible: true },
  { key: "recentCounsels", visible: true },
  { key: "recentReviews", visible: true },
  { key: "recentNotices", visible: true },
  { key: "recentFaqs", visible: false },
  { key: "recentVendorNotices", visible: false },
  { key: "recentVendorCounsels", visible: false },
  { key: "operatingTips", visible: true },
];
const WIDGET_KEYS = DEFAULT_WIDGET_LAYOUT.map((w) => w.key);

// Port of managers/index.php's per-admin 위젯배치(mallRN_admin_configuration.
// widget_info). The content set mirrors managers/widget/* while ordering is
// an accessible explicit list rather than a drag-and-drop-only grid.
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
