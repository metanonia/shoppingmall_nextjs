import { getAgreementPages } from "@shoppingmall/core";
import { AgreementConfigForm } from "@/components/SettingsForms";

export default async function AgreementSettingsPage() {
  const agreements = await getAgreementPages();
  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>약관 설정</h1>
      <AgreementConfigForm agreements={agreements} />
    </div>
  );
}
