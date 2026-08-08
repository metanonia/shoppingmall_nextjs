import { logoutAction } from "@/app/logout/actions";

const NAV_SECTIONS: { title: string; items: { href: string; label: string }[] }[] = [
  { title: "대시보드", items: [{ href: "/", label: "홈" }] },
  {
    title: "주문",
    items: [
      { href: "/orders", label: "주문관리" },
      { href: "/order-cancel-log", label: "PG 취소 로그" },
      { href: "/delivery-api-log", label: "배송추적 로그" },
    ],
  },
  {
    title: "상품",
    items: [
      { href: "/goods", label: "상품관리" },
      { href: "/goods/display", label: "진열관리" },
      { href: "/goods/bulk-edit", label: "일괄수정" },
      { href: "/goods/import", label: "엑셀 일괄등록" },
      { href: "/categories", label: "카테고리" },
      { href: "/exhibitions", label: "기획전" },
    ],
  },
  {
    title: "회원",
    items: [
      { href: "/members", label: "회원관리" },
      { href: "/members/import", label: "회원 엑셀 일괄등록" },
      { href: "/coupons", label: "쿠폰관리" },
      { href: "/mileage-log", label: "마일리지 내역" },
      { href: "/member-sleep", label: "휴면회원" },
      { href: "/sms-log", label: "SMS 발송이력" },
      { href: "/access-log", label: "접속 로그" },
    ],
  },
  {
    title: "게시판",
    items: [
      { href: "/board/notice", label: "공지사항" },
      { href: "/board/faq", label: "FAQ" },
      { href: "/board/counsel", label: "1:1문의" },
    ],
  },
  {
    title: "디자인",
    items: [
      { href: "/banners", label: "배너" },
      { href: "/popups", label: "팝업" },
      { href: "/pages", label: "정적페이지" },
    ],
  },
  {
    title: "설정",
    items: [
      { href: "/settings/basic", label: "기본정보" },
      { href: "/settings/member", label: "회원정책" },
      { href: "/settings/member-levels", label: "회원등급설정" },
      { href: "/settings/goods", label: "상품환경설정" },
      { href: "/settings/delivery", label: "배송" },
      { href: "/settings/payment", label: "결제" },
      { href: "/settings/agreement", label: "약관" },
    ],
  },
  {
    title: "통계",
    items: [
      { href: "/stats/sales", label: "매출통계" },
      { href: "/stats/margin", label: "마진통계" },
      { href: "/stats/members", label: "회원통계" },
      { href: "/stats/goods-ranking", label: "상품랭킹" },
      { href: "/stats/mileage", label: "마일리지통계" },
    ],
  },
  { title: "개발자", items: [{ href: "/db-error-log", label: "오류 로그" }] },
  { title: "입점사", items: [{ href: "/vendors", label: "입점사관리" }] },
];

export function Sidebar() {
  return (
    <nav style={{ width: 200, flexShrink: 0, borderRight: "1px solid #eee", padding: "20px 12px", height: "100vh", overflowY: "auto" }}>
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: "#999", marginBottom: 6, fontWeight: 600 }}>{section.title}</div>
          {section.items.map((item) => (
            <a key={item.href} href={item.href} style={{ display: "block", padding: "6px 8px", borderRadius: 4 }}>
              {item.label}
            </a>
          ))}
        </div>
      ))}
      <form action={logoutAction} style={{ marginTop: 20 }}>
        <button type="submit" style={{ fontSize: 12, color: "#999" }}>
          로그아웃
        </button>
      </form>
    </nav>
  );
}
