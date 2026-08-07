import { getAgreementPages, getShopConfig } from "@shoppingmall/core";

// Port of php/privacy.php. {JOINFORM}/{DELIVERYNAME}/{PGNAME} depend on
// tables this migration hasn't ported yet (member_config's optional-field
// toggles, delivery_info's per-carrier list) — left blank rather than
// blocking the page, see MIGRATION.md.
export default async function PrivacyPage() {
  const [config, agreements] = await Promise.all([getShopConfig(), getAgreementPages()]);

  const html = (agreements.privacy || "")
    .replaceAll("{COMPANY}", config.compName)
    .replaceAll("{JOINFORM}", "")
    .replaceAll("{DELIVERYNAME}", "")
    .replaceAll("{PGNAME}", "NHN한국사이버결제 주식회사")
    .replaceAll("{MANAGERNAME}", config.basicAdmin)
    .replaceAll("{MANAGERTEL}", config.compTel)
    .replaceAll("{MANAGEREMAIL}", config.basicEmail);

  return (
    <div id="contents">
      <h2 className="contentTitle">개인정보처리방침</h2>
      <div className="empty30" />
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
