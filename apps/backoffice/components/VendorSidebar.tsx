import { vendorLogoutAction } from "@/app/vendor/actions";

const NAV_ITEMS = [
  { href: "/vendor/dashboard", label: "대시보드" },
  { href: "/vendor/goods", label: "상품관리" },
  { href: "/vendor/goods/display", label: "스토어 진열관리" },
  { href: "/vendor/orders", label: "주문관리" },
  { href: "/vendor/settlement", label: "정산" },
  { href: "/vendor/store", label: "스토어설정" },
  { href: "/vendor/profile", label: "업체정보관리" },
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
