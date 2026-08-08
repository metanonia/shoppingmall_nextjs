import { getAdminDashboardStats } from "@shoppingmall/core";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export default async function DashboardPage() {
  const stats = await getAdminDashboardStats();

  const cards = [
    { label: "오늘 주문건수", value: `${stats.todayOrderCount}건` },
    { label: "오늘 매출", value: `${formatWon(stats.todaySalesTotal)}원` },
    { label: "미답변 1:1문의", value: `${stats.unansweredCounselCount}건`, href: "/board/counsel" },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>대시보드</h1>
      <div style={{ display: "flex", gap: 16 }}>
        {cards.map((card) => (
          <a
            key={card.label}
            href={card.href ?? "#"}
            style={{ display: "block", width: 200, padding: 20, border: "1px solid #eee", borderRadius: 8 }}
          >
            <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{card.value}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
