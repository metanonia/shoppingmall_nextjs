import { requireVendor } from "@/lib/auth";
import { VendorSidebar } from "@/components/VendorSidebar";

// Nested route group inside the real app/vendor/ folder — app/vendor/page.tsx
// (the public login form) sits outside this group so requireVendor()'s
// redirect target (/vendor) never points back into the gate it's guarding.
export default async function VendorProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireVendor();

  return (
    <div style={{ display: "flex" }}>
      <VendorSidebar vendorId={session.vendorId ?? ""} />
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}
