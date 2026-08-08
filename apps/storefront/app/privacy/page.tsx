import { getAgreementPages, getMemberFormConfig, getShopConfig } from "@shoppingmall/core";

// Port of php/privacy.php including dynamic registration fields, enabled
// delivery companies and the configured payment provider placeholder.
export default async function PrivacyPage() {
  const [config, agreements, member] = await Promise.all([getShopConfig(), getAgreementPages(), getMemberFormConfig()]);
  const fields: [number, string][] = [
    [member.telRequired, "전화번호"], [member.cellRequired, "휴대폰번호"], [member.addressRequired, "주소"],
    [member.birthRequired, "생년월일"], [member.genderRequired, "성별"], [member.marryRequired, "결혼여부"],
    [member.jobRequired, "직업"], [member.hobbyRequired, "관심분야"], [member.compRequired, "회사명"],
    [member.compNumRequired, "사업자등록번호"], [member.compOwnerRequired, "대표자명"], [member.compAddressRequired, "사업자주소"],
    [member.compTypeRequired, "업태"], [member.compItemRequired, "종목"],
    ...member.customFields.map((field) => [field.required, field.title] as [number, string]),
  ];
  const joinForm = fields.filter(([required, title]) => required > 0 && title).map(([, title]) => title).join(", ");

  const html = (agreements.privacy || "")
    .replaceAll("{COMPANY}", config.compName)
    .replaceAll("{JOINFORM}", joinForm)
    .replaceAll("{DELIVERYNAME}", config.deliveryCompanies.join(", "))
    .replaceAll("{PGNAME}", config.paymentCp || "선정 결제대행사")
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
