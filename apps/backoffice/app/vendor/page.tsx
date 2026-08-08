import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { VendorLoginForm } from "@/components/VendorLoginForm";

// Public entry point (footer's "입점사로그인" link points here) — doubles as
// the login page. A real "vendor" folder (not a route group) so this can sit
// outside the requireVendor() gate that protects everything under
// app/vendor/(protected)/ — otherwise a logged-out visit here would redirect
// to itself forever.
export default async function VendorLoginPage() {
  const session = await getSession();
  if (session?.role === "vendor") redirect("/vendor/dashboard");

  return <VendorLoginForm />;
}
