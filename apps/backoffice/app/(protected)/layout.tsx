import { requireAdmin } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

// Route group wrapping every admin page except /login — requireAdmin()
// redirects to /login for anyone without a valid admin session, so no
// individual page needs to repeat that check.
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}
