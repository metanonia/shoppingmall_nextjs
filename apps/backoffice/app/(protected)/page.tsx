import { getAdminDashboardStats, getWidgetLayout, type DashboardWidgetKey } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";
import { WidgetLayoutForm } from "@/components/WidgetLayoutForm";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

const WIDGET_LABELS: Record<DashboardWidgetKey, string> = {
  todayOrderCount: "오늘 주문건수",
  todaySalesTotal: "오늘 매출",
  unansweredCounselCount: "미답변 1:1문의",
};

export default async function DashboardPage() {
  const session = await requireAdmin();
  const [stats, layout] = await Promise.all([getAdminDashboardStats(), getWidgetLayout(session.userId)]);

  const cardData: Record<DashboardWidgetKey, { value: string; href?: string }> = {
    todayOrderCount: { value: `${stats.todayOrderCount}건` },
    todaySalesTotal: { value: `${formatWon(stats.todaySalesTotal)}원` },
    unansweredCounselCount: { value: `${stats.unansweredCounselCount}건`, href: "/board/counsel" },
  };

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>대시보드</h1>
      <div style={{ display: "flex", gap: 16, marginBottom: 30 }}>
        {layout
          .filter((w) => w.visible)
          .map((w) => (
            <a
              key={w.key}
              href={cardData[w.key].href ?? "#"}
              style={{ display: "block", width: 200, padding: 20, border: "1px solid #eee", borderRadius: 8 }}
            >
              <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>{WIDGET_LABELS[w.key]}</div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{cardData[w.key].value}</div>
            </a>
          ))}
      </div>

      <WidgetLayoutForm layout={layout} labels={WIDGET_LABELS} />
    </div>
  );
}
