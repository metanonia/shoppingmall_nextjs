import { requireVendor } from "@/lib/auth";
import { VendorSidebar } from "@/components/VendorSidebar";
import { getFirebaseWebConfig, getVendorPushToken } from "@shoppingmall/core";
import { PushAutoRegistration } from "@/components/PushTokenForm";
import { updateVendorPushAction } from "./push-settings/actions";

// Nested route group inside the real app/vendor/ folder — app/vendor/page.tsx
// (the public login form) sits outside this group so requireVendor()'s
// redirect target (/vendor) never points back into the gate it's guarding.
export default async function VendorProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireVendor();
  const vendorId = session.vendorId ?? session.userId;
  const [push, firebaseConfig] = await Promise.all([getVendorPushToken(vendorId), getFirebaseWebConfig()]);

  return (
    <div style={{ display: "flex" }}>
      <PushAutoRegistration action={updateVendorPushAction} initial={push} config={firebaseConfig} />
      <VendorSidebar vendorId={session.vendorId ?? ""} />
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}
