import { getVendorDashboardStats } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export default async function VendorDashboardPage() {
  const session = await requireVendor();
  const stats = await getVendorDashboardStats(session.vendorId ?? "");

  const cards = [
    { label: "오늘 주문건수", value: `${stats.todayOrderCount}건` },
    { label: "오늘 매출", value: `${formatWon(stats.todaySalesTotal)}원` },
    { label: "오늘 등록상품", value: `${stats.todayGoodsCount}건`, href: "/vendor/goods" },
    { label: "오늘 방문자", value: `${stats.todayVisitorCount}명` },
    { label: "게시물 현황", value: `오늘 ${stats.boardTodayCount}건 / 전체 ${stats.boardTotalCount}건`, href: "/vendor/board/vcounsel" },
    { label: "승인대기 상품", value: `${stats.pendingGoodsCount}건`, href: "/vendor/goods" },
    { label: "미답변 상품문의", value: `${stats.unansweredInquiryCount}건`, href: "/vendor/inquiries" },
    { label: "교환·반품 요청", value: `${stats.activeOrderChangeCount}건`, href: "/vendor/order-changes" },
    { label: "배송 처리중", value: `${stats.shippingCount}건`, href: "/vendor/orders" },
    { label: "구매후기", value: `${stats.reviewCount}건` },
    { label: "정산 대기", value: `${stats.settlementPendingCount}건`, href: "/vendor/settlement" },
    { label: "처리단계별 주문", value: stats.orderStepCounts.map((row) => `${row.status}: ${row.today}/${row.total}`).join(" · "), href: "/vendor/orders" },
    { label: "최근 주문", value: stats.recentOrders.map((row) => row.label).join("\n") || "내역 없음", href: "/vendor/orders" },
    { label: "최근 상품문의", value: stats.recentInquiries.map((row) => row.label).join("\n") || "내역 없음", href: "/vendor/inquiries" },
    { label: "최근 구매후기", value: stats.recentReviews.map((row) => row.label).join("\n") || "내역 없음", href: "/vendor/reviews" },
    { label: "본사 공지사항", value: stats.recentNotices.map((row) => row.label).join("\n") || "내역 없음", href: "/vendor/board/vnotice" },
    { label: "최근 정산내역", value: stats.recentSettlements.map((row) => row.label).join("\n") || "내역 없음", href: "/vendor/settlement" },
    { label: "운영 Tip", value: "상품문의와 교환·반품 요청, 배송중 주문 및 정산대기를 매일 확인하세요." },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>대시보드</h1>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {cards.map((card) => (
          <a
            key={card.label}
            href={card.href ?? "#"}
            style={{ display: "block", width: 200, padding: 20, border: "1px solid #eee", borderRadius: 8 }}
          >
            <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>{card.label}</div>
            <div style={{ fontSize: card.value.includes("\n") ? 13 : 22, fontWeight: 600, whiteSpace: "pre-line", lineHeight: 1.7 }}>{card.value}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
