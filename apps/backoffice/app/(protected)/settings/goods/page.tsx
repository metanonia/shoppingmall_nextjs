import { getShopConfig } from "@shoppingmall/core";
import { GoodsConfigForm } from "@/components/SettingsForms";
import { GoodsIconManager } from "@/components/GoodsIconManager";

export default async function GoodsSettingsPage() {
  const config = await getShopConfig();
  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>상품환경설정</h1>
      <GoodsConfigForm config={config} />
      <GoodsIconManager icons={config.goodsIconInfo} />
    </div>
  );
}
