import { notFound } from "next/navigation";
import {
  getFavoriteGoodsCount,
  getFavoriteStoreCount,
  getGoodsDetail,
  getGoodsInquiries,
  isFavoriteGoods,
  isFavoriteStore,
} from "@shoppingmall/core";
import { getCachedMemberDiscountPct, getCachedShopConfig, getDevice, getSiteChrome } from "@/lib/request";
import { ProductDetail } from "@/components/ProductDetail";

// Port of php/view.php. View-count increment and recent-view tracking need a
// cart_id guest cookie (php/init.php's getCartId()) — deferred alongside the
// cart engine (Phase 4).
export default async function GoodsDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const uidNum = Number(uid);
  if (!Number.isInteger(uidNum)) notFound();

  const [device, config, memberDiscountPct, { member }] = await Promise.all([
    getDevice(),
    getCachedShopConfig(),
    getCachedMemberDiscountPct(),
    getSiteChrome(),
  ]);
  const detail = await getGoodsDetail(uidNum, config, memberDiscountPct);
  if (!detail) notFound();

  const inquiries = await getGoodsInquiries(uidNum, member?.id ?? null);
  const favorite = {
    isMember: Boolean(member),
    favoritedGoods: member ? await isFavoriteGoods(member.id, uidNum) : false,
    favoriteGoodsCount: await getFavoriteGoodsCount(uidNum),
    favoritedStore: member && detail.vendor ? await isFavoriteStore(member.id, detail.vendor) : false,
    favoriteStoreCount: detail.vendor ? await getFavoriteStoreCount(detail.vendor) : 0,
  };

  return <ProductDetail detail={detail} device={device} favorite={favorite} inquiries={inquiries} />;
}
