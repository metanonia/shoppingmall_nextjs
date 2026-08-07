import { getAgreementPages, getShopConfig } from "@shoppingmall/core";

// Port of php/agreement.php. Renders admin-authored rich text (no admin UI
// yet, seed-data only) with legacy's {TOKEN} placeholder substitution.
export default async function AgreementPage() {
  const [config, agreements] = await Promise.all([getShopConfig(), getAgreementPages()]);
  const signDate = new Date(config.signDate * 1000);

  const html = (agreements.terms || "")
    .replaceAll("{COMPANY}", config.compName)
    .replaceAll("{SHOPNAME}", config.basicName)
    .replaceAll("{SYEAR}", String(signDate.getFullYear()))
    .replaceAll("{SMONTH}", String(signDate.getMonth() + 1).padStart(2, "0"))
    .replaceAll("{SDAY}", String(signDate.getDate()).padStart(2, "0"));

  return (
    <div id="contents">
      <h2 className="contentTitle">이용약관</h2>
      <div className="empty30" />
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
