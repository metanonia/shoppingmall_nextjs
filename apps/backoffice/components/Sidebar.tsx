import { logoutAction } from "@/app/logout/actions";

const NAV_SECTIONS: { title: string; items: { href: string; label: string }[] }[] = [
  { title: "대시보드", items: [{ href: "/", label: "홈" }] },
  { title: "주문", items: [{ href: "/orders", label: "주문관리" }] },
  {
    title: "상품",
    items: [
      { href: "/goods", label: "상품관리" },
      { href: "/categories", label: "카테고리" },
      { href: "/exhibitions", label: "기획전" },
    ],
  },
  {
    title: "회원",
    items: [
      { href: "/members", label: "회원관리" },
      { href: "/members/withdrawals", label: "탈퇴회원" },
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
      { href: "/settings/delivery", label: "배송" },
      { href: "/settings/payment", label: "결제" },
      { href: "/settings/agreement", label: "약관" },
    ],
  },
  { title: "통계", items: [{ href: "/stats/sales", label: "매출통계" }] },
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
