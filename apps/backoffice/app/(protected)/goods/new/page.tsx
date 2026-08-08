import { getAdminCategoryTree, getShopConfig, getVendorOptions } from "@shoppingmall/core";
import { GoodsForm } from "@/components/GoodsForm";

export default async function NewGoodsPage() {
  const [categoryTree, vendors, config] = await Promise.all([getAdminCategoryTree(), getVendorOptions(), getShopConfig()]);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>상품 등록</h1>
      <GoodsForm initial={null} categoryTree={categoryTree} vendors={vendors} masterValues={{ brands: config.goodsBrandInfo, makes: config.goodsMakeInfo, origins: config.goodsOriginInfo, requireInfo: config.goodsRequireInfo, icons: config.goodsIconInfo }} />
    </div>
  );
}
