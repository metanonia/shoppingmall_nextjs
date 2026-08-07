import { redirect } from "next/navigation";
import { getMyFavoriteGoods } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";
import { getCachedShopConfig, getDevice } from "@/lib/request";
import { GoodsGrid } from "@/components/GoodsGrid";

// Port of php/my_favorite_goods.php — no pagination in legacy either.
export default async function MyFavoriteGoodsPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect_to=/my_favorite_goods");

  const [device, config] = await Promise.all([getDevice(), getCachedShopConfig()]);
  const goods = await getMyFavoriteGoods(session.userId, config);

  return (
    <div id="contents">
      <h2 className="contentTitle">관심상품</h2>
      <div className="empty30" />
      <GoodsGrid goods={goods} device={device} emptyMessage="관심상품으로 등록한 상품이 없습니다." />
    </div>
  );
}
