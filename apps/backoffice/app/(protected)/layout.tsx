import { requireAdmin } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { getAdminPushToken, getFirebaseWebConfig } from "@shoppingmall/core";
import { PushAutoRegistration } from "@/components/PushTokenForm";
import { updateAdminPushAction } from "./push-settings/actions";

// Route group wrapping every admin page except /login — requireAdmin()
// redirects to /login for anyone without a valid admin session, so no
// individual page needs to repeat that check.
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const [push, firebaseConfig] = await Promise.all([getAdminPushToken(session.userId), getFirebaseWebConfig()]);

  return (
    <div style={{ display: "flex" }}>
      <PushAutoRegistration action={updateAdminPushAction} initial={push} config={firebaseConfig} />
      <Sidebar />
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}
