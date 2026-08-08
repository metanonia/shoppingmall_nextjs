import { notFound } from "next/navigation";
import { getAdminCategoryTree, getAdminGoodsDetail, getVendorOptions } from "@shoppingmall/core";
import { GoodsForm } from "@/components/GoodsForm";
import { GoodsOptionBuilder } from "@/components/GoodsOptionBuilder";

export default async function EditGoodsPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid: uidParam } = await params;
  const uid = Number(uidParam);
  if (!Number.isInteger(uid)) notFound();

  const [goods, categoryTree, vendors] = await Promise.all([getAdminGoodsDetail(uid), getAdminCategoryTree(), getVendorOptions()]);
  if (!goods) notFound();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>상품 수정 — {goods.name}</h1>
      <GoodsForm initial={goods} categoryTree={categoryTree} vendors={vendors} />
      <div className="empty30" />
      <GoodsOptionBuilder guid={uid} options={goods.options} />
    </div>
  );
}
