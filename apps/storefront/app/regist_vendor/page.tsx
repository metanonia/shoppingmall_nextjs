import { RegistVendorForm } from "@/components/RegistVendorForm";

// Port of php/regist_vendor.php — public self-service vendor application,
// reachable without login (footer "입점신청" link, same section legacy
// groups with member login/registration). Approval happens on the Phase 7
// admin screen (/vendors), not here.
export default function RegistVendorPage() {
  return (
    <div id="contents">
      <h2 className="contentTitle">입점신청</h2>
      <div className="empty30" />
      <RegistVendorForm />
    </div>
  );
}
