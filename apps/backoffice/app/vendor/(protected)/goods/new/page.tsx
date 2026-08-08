import { getAdminCategoryTree, getVendorGoodsMasterValues } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";
import { GoodsForm } from "@/components/GoodsForm";
import { createVendorGoodsAction, updateVendorGoodsAction } from "@/app/vendor/(protected)/goods/actions";

export default async function NewVendorGoodsPage() {
  const session = await requireVendor();
  const vendorId = session.vendorId ?? "";
  const [categoryTree, masterValues] = await Promise.all([getAdminCategoryTree(), getVendorGoodsMasterValues(vendorId)]);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>상품 등록</h1>
      <GoodsForm
        initial={null}
        categoryTree={categoryTree}
        vendors={[]}
        vendorLocked={vendorId}
        actions={{ create: createVendorGoodsAction, update: updateVendorGoodsAction }}
        masterValues={masterValues}
      />
    </div>
  );
}
