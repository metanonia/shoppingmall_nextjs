import { notFound } from "next/navigation";
import { getGoodsDetail } from "@shoppingmall/core";
import { getCachedShopConfig, getDevice } from "@/lib/request";
import { ProductDetail } from "@/components/ProductDetail";

// Port of php/view.php. View-count increment and recent-view tracking need a
// cart_id guest cookie (php/init.php's getCartId()) — deferred alongside the
// cart engine (Phase 4).
export default async function GoodsDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const uidNum = Number(uid);
  if (!Number.isInteger(uidNum)) notFound();

  const [device, config] = await Promise.all([getDevice(), getCachedShopConfig()]);
  const detail = await getGoodsDetail(uidNum, config);
  if (!detail) notFound();

  return <ProductDetail detail={detail} device={device} />;
}
