import { getShopConfig } from "@shoppingmall/core";
import { BasicConfigForm } from "@/components/SettingsForms";

export default async function BasicSettingsPage() {
  const config = await getShopConfig();
  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>기본정보 설정</h1>
      <BasicConfigForm config={config} />
    </div>
  );
}
