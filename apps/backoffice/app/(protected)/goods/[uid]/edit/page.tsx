import { notFound } from "next/navigation";
import { getAdminCategoryTree, getAdminGoodsDetail, getShopConfig, getVendorOptions } from "@shoppingmall/core";
import { GoodsForm } from "@/components/GoodsForm";
import { GoodsOptionBuilder } from "@/components/GoodsOptionBuilder";

export default async function EditGoodsPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid: uidParam } = await params;
  const uid = Number(uidParam);
  if (!Number.isInteger(uid)) notFound();

  const [goods, categoryTree, vendors, config] = await Promise.all([getAdminGoodsDetail(uid), getAdminCategoryTree(), getVendorOptions(), getShopConfig()]);
  if (!goods) notFound();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>상품 수정 — {goods.name}</h1>
      <GoodsForm initial={goods} categoryTree={categoryTree} vendors={vendors} masterValues={{ brands: config.goodsBrandInfo, makes: config.goodsMakeInfo, origins: config.goodsOriginInfo, requireInfo: config.goodsRequireInfo, icons: config.goodsIconInfo }} />
      <div className="empty30" />
      <GoodsOptionBuilder guid={uid} options={goods.options} optionNames={config.goodsOptionInfo} />
    </div>
  );
}
