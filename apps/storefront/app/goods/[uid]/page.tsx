import { notFound } from "next/navigation";
import {
  getDownloadableCoupons,
  getFavoriteGoodsCount,
  getFavoriteStoreCount,
  getGoodsDetail,
  getGoodsInquiries,
  getGoodsReviews,
  isFavoriteGoods,
  isFavoriteStore,
} from "@shoppingmall/core";
import { getCachedMemberDiscountPct, getCachedShopConfig, getDevice, getSiteChrome } from "@/lib/request";
import { ProductDetail } from "@/components/ProductDetail";
import { getCartId } from "@/lib/cart-id";
import { GoodsViewTracker } from "@/components/GoodsViewTracker";

// Port of php/view.php, including cart-id-scoped recent-view and daily view
// counting through GoodsViewTracker.
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
  const cartId = await getCartId(member?.id ?? null);
  const detail = await getGoodsDetail(uidNum, config, memberDiscountPct, { memberId: member?.id ?? null, cartId });
  if (!detail) notFound();

  const [inquiries, reviews] = await Promise.all([
    getGoodsInquiries(uidNum, member?.id ?? null),
    getGoodsReviews(uidNum),
  ]);
  const favorite = {
    isMember: Boolean(member),
    favoritedGoods: member ? await isFavoriteGoods(member.id, uidNum) : false,
    favoriteGoodsCount: await getFavoriteGoodsCount(uidNum),
    favoritedStore: member && detail.vendor ? await isFavoriteStore(member.id, detail.vendor) : false,
    favoriteStoreCount: detail.vendor ? await getFavoriteStoreCount(detail.vendor) : 0,
  };
  const downloadableCoupons = await getDownloadableCoupons(uidNum);

  return (
    <>
      <GoodsViewTracker goodsUid={detail.uid} vendor={detail.vendor} />
      <ProductDetail
        detail={detail}
        device={device}
        favorite={favorite}
        inquiries={inquiries}
        reviews={reviews}
        downloadableCoupons={downloadableCoupons}
        inquiryConfig={{
          allowGuest: config.inquiryAccessWrite === 0,
          secretType: config.inquirySecretType,
          privacy: config.inquiryPrivacyType === 1,
          categoryInfo: config.inquiryCategoryInfo,
          guestAgreement: config.inquiryGuestAgreement,
        }}
        naverPayEnabled={config.naverPayUsed && Boolean(config.naverPayShopId && config.naverPayCertKey)}
      />
    </>
  );
}
