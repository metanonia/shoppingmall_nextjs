import { getShopConfig } from "@shoppingmall/core";
import { PaymentConfigForm } from "@/components/SettingsForms";

export default async function PaymentSettingsPage() {
  const config = await getShopConfig();
  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>결제 설정</h1>
      <PaymentConfigForm config={config} />
    </div>
  );
}
