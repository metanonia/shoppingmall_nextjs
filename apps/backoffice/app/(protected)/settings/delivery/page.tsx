import { getShopConfig } from "@shoppingmall/core";
import { DeliveryConfigForm } from "@/components/SettingsForms";

export default async function DeliverySettingsPage() {
  const config = await getShopConfig();
  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>배송 설정</h1>
      <DeliveryConfigForm config={config} />
    </div>
  );
}
