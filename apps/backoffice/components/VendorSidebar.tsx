import { vendorLogoutAction } from "@/app/vendor/actions";

const NAV_ITEMS = [
  { href: "/vendor/dashboard", label: "대시보드" },
  { href: "/vendor/goods", label: "상품관리" },
  { href: "/vendor/goods/display", label: "스토어 진열관리" },
  { href: "/vendor/goods/bulk-edit", label: "상품 일괄수정" },
  { href: "/vendor/goods/import", label: "엑셀 일괄등록" },
  { href: "/vendor/orders", label: "주문관리" },
  { href: "/vendor/order-changes", label: "교환·반품 접수" },
  { href: "/vendor/settlement", label: "정산" },
  { href: "/vendor/stats/sales", label: "매출통계" },
  { href: "/vendor/stats/sales-detail", label: "매출상세" },
  { href: "/vendor/stats/settlement", label: "정산통계" },
  { href: "/vendor/stats/settlement-detail", label: "정산상세" },
  { href: "/vendor/store", label: "스토어설정" },
  { href: "/vendor/profile", label: "업체정보관리" },
  { href: "/vendor/board/vnotice", label: "본사 공지사항" },
  { href: "/vendor/board/vcounsel", label: "본사 1:1문의" },
  { href: "/vendor/inquiries", label: "상품문의" },
  { href: "/vendor/reviews", label: "구매후기" },
  { href: "/vendor/push-settings", label: "푸시 알림" },
];

export function VendorSidebar({ vendorId }: { vendorId: string }) {
  return (
    <nav style={{ width: 200, flexShrink: 0, borderRight: "1px solid #eee", padding: "20px 12px", height: "100vh" }}>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>{vendorId}</div>
      {NAV_ITEMS.map((item) => (
        <a key={item.href} href={item.href} style={{ display: "block", padding: "6px 8px", borderRadius: 4 }}>
          {item.label}
        </a>
      ))}
      <form action={vendorLogoutAction} style={{ marginTop: 20 }}>
        <button type="submit" style={{ fontSize: 12, color: "#999" }}>
          로그아웃
        </button>
      </form>
    </nav>
  );
}
