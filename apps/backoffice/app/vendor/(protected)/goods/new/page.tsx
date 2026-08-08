import { getAdminCategoryTree } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";
import { GoodsForm } from "@/components/GoodsForm";
import { createVendorGoodsAction, updateVendorGoodsAction } from "@/app/vendor/(protected)/goods/actions";

export default async function NewVendorGoodsPage() {
  const session = await requireVendor();
  const categoryTree = await getAdminCategoryTree();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>상품 등록</h1>
      <GoodsForm
        initial={null}
        categoryTree={categoryTree}
        vendors={[]}
        vendorLocked={session.vendorId ?? ""}
        actions={{ create: createVendorGoodsAction, update: updateVendorGoodsAction }}
      />
    </div>
  );
}
