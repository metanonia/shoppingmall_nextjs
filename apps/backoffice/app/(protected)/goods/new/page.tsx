import { getAdminCategoryTree, getVendorOptions } from "@shoppingmall/core";
import { GoodsForm } from "@/components/GoodsForm";

export default async function NewGoodsPage() {
  const [categoryTree, vendors] = await Promise.all([getAdminCategoryTree(), getVendorOptions()]);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>상품 등록</h1>
      <GoodsForm initial={null} categoryTree={categoryTree} vendors={vendors} />
    </div>
  );
}
