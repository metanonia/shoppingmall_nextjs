import { notFound } from "next/navigation";
import { getAdminCategoryTree, getAdminGoodsDetail } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";
import { GoodsForm } from "@/components/GoodsForm";
import { GoodsOptionBuilder } from "@/components/GoodsOptionBuilder";
import {
  createVendorGoodsAction,
  createVendorGoodsOptionsAction,
  deleteVendorGoodsOptionAction,
  updateVendorGoodsAction,
  updateVendorGoodsOptionAction,
} from "@/app/vendor/(protected)/goods/actions";

export default async function EditVendorGoodsPage({ params }: { params: Promise<{ uid: string }> }) {
  const session = await requireVendor();
  const { uid: uidParam } = await params;
  const uid = Number(uidParam);
  if (!Number.isInteger(uid)) notFound();

  const [goods, categoryTree] = await Promise.all([getAdminGoodsDetail(uid), getAdminCategoryTree()]);
  if (!goods || goods.vendor !== session.vendorId) notFound();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>상품 수정 — {goods.name}</h1>
      <GoodsForm
        initial={goods}
        categoryTree={categoryTree}
        vendors={[]}
        vendorLocked={session.vendorId ?? ""}
        actions={{ create: createVendorGoodsAction, update: updateVendorGoodsAction }}
      />
      <div className="empty30" />
      <GoodsOptionBuilder
        guid={uid}
        options={goods.options}
        actions={{ create: createVendorGoodsOptionsAction, update: updateVendorGoodsOptionAction, delete: deleteVendorGoodsOptionAction }}
      />
    </div>
  );
}
