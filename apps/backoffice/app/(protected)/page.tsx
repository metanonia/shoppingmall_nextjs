import { getAdminDashboardStats, getWidgetLayout, type DashboardWidgetKey } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";
import { WidgetLayoutForm } from "@/components/WidgetLayoutForm";
import type { ReactNode } from "react";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

const WIDGET_LABELS: Record<DashboardWidgetKey, string> = {
  todayOrderCount: "오늘 주문건수",
  todaySalesTotal: "오늘 매출",
  todayGoodsCount: "오늘 등록상품",
  todayMemberCount: "오늘 회원가입",
  todayVisitorCount: "오늘 방문자",
  todayMarginTotal: "오늘 마진",
  boardPostCount: "게시물 현황",
  orderStepCount: "처리단계별 주문현황",
  unansweredCounselCount: "미답변 1:1문의",
  unansweredInquiryCount: "미답변 상품문의",
  unansweredVendorCounselCount: "미답변 판매사문의",
  activeOrderChangeCount: "교환·반품·취소 요청",
  pendingCashReceiptCount: "현금영수증 요청",
  pendingGoodsCount: "승인대기 상품",
  pendingVendorCount: "승인대기 판매사",
  memberCount: "전체 회원",
  shippingCount: "배송 처리중",
  errorCount: "미확인 오류",
  recentOrders: "최근 주문 내역",
  recentMembers: "최근 회원가입 내역",
  recentInquiries: "최근 상품문의",
  recentCounsels: "최근 1:1문의",
  recentReviews: "최근 구매후기",
  recentNotices: "최근 공지사항",
  recentFaqs: "최근 자주찾는 질문",
  recentVendorNotices: "최근 판매사 공지",
  recentVendorCounsels: "최근 판매사 문의",
  operatingTips: "운영 Tip",
};

function listValue(rows: { id: string; label: string }[]): ReactNode {
  return rows.length ? <ul style={{ fontSize: 12, lineHeight: 1.8 }}>{rows.map((row) => <li key={row.id}>{row.label}</li>)}</ul> : <span style={{ fontSize: 13, color: "#999" }}>등록 내역 없음</span>;
}

export default async function DashboardPage() {
  const session = await requireAdmin();
  const [stats, layout] = await Promise.all([getAdminDashboardStats(), getWidgetLayout(session.userId)]);

  const cardData: Record<DashboardWidgetKey, { value: ReactNode; href?: string; wide?: boolean }> = {
    todayOrderCount: { value: `${stats.todayOrderCount}건` },
    todaySalesTotal: { value: `${formatWon(stats.todaySalesTotal)}원` },
    todayGoodsCount: { value: `${stats.todayGoodsCount}건`, href: "/goods" },
    todayMemberCount: { value: `${stats.todayMemberCount}명`, href: "/members" },
    todayVisitorCount: { value: `${stats.todayVisitorCount}명`, href: "/stats/visitors" },
    todayMarginTotal: { value: `${formatWon(stats.todayMarginTotal)}원`, href: "/stats/margin" },
    boardPostCount: { value: `오늘 ${stats.todayBoardCount}건 / 전체 ${stats.totalBoardCount}건`, wide: true },
    orderStepCount: { value: <ul style={{ fontSize: 12, lineHeight: 1.8 }}>{stats.orderStepCounts.map((row) => <li key={row.status}>단계 {row.status}: 오늘 {row.today} / 전체 {row.total}</li>)}</ul>, href: "/orders", wide: true },
    unansweredCounselCount: { value: `${stats.unansweredCounselCount}건`, href: "/board/counsel" },
    unansweredInquiryCount: { value: `${stats.unansweredInquiryCount}건`, href: "/inquiries" },
    unansweredVendorCounselCount: { value: `${stats.unansweredVendorCounselCount}건`, href: "/board/vcounsel" },
    activeOrderChangeCount: { value: `${stats.activeOrderChangeCount}건`, href: "/order-changes" },
    pendingCashReceiptCount: { value: `${stats.pendingCashReceiptCount}건`, href: "/cash-receipts" },
    pendingGoodsCount: { value: `${stats.pendingGoodsCount}건`, href: "/goods" },
    pendingVendorCount: { value: `${stats.pendingVendorCount}건`, href: "/vendors" },
    memberCount: { value: `${stats.memberCount}명`, href: "/members" },
    shippingCount: { value: `${stats.shippingCount}건`, href: "/orders" },
    errorCount: { value: `${stats.errorCount}건`, href: "/db-error-log" },
    recentOrders: { value: listValue(stats.recentOrders), href: "/orders", wide: true },
    recentMembers: { value: listValue(stats.recentMembers), href: "/members", wide: true },
    recentInquiries: { value: listValue(stats.recentInquiries), href: "/inquiries", wide: true },
    recentCounsels: { value: listValue(stats.recentCounsels), href: "/board/counsel", wide: true },
    recentReviews: { value: listValue(stats.recentReviews), href: "/reviews", wide: true },
    recentNotices: { value: listValue(stats.recentNotices), href: "/board/notice", wide: true },
    recentFaqs: { value: listValue(stats.recentFaqs), href: "/board/faq", wide: true },
    recentVendorNotices: { value: listValue(stats.recentVendorNotices), href: "/board/vnotice", wide: true },
    recentVendorCounsels: { value: listValue(stats.recentVendorCounsels), href: "/board/vcounsel", wide: true },
    operatingTips: { value: <span style={{ fontSize: 13 }}>상품·주문·회원 목록의 검색 조건은 Excel 다운로드에도 동일하게 적용됩니다. 배송추적과 자동 구매확정 cron 상태를 정기적으로 확인하세요.</span>, wide: true },
  };

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>대시보드</h1>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 30 }}>
        {layout
          .filter((w) => w.visible)
          .map((w) => (
            <a
              key={w.key}
              href={cardData[w.key].href ?? "#"}
              style={{ display: "block", width: cardData[w.key].wide ? 300 : 200, padding: 20, border: "1px solid #eee", borderRadius: 8 }}
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
