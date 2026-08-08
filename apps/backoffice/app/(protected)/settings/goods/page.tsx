import { getShopConfig } from "@shoppingmall/core";
import { GoodsConfigForm } from "@/components/SettingsForms";

export default async function GoodsSettingsPage() {
  const config = await getShopConfig();
  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>상품환경설정</h1>
      <GoodsConfigForm config={config} />
    </div>
  );
}
