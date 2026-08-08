import { redirect } from "next/navigation";
import { getRecentViewedGoods } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";
import { getCachedShopConfig } from "@/lib/request";
import { GoodsCard } from "@/components/GoodsCard";
import { deleteRecentViewedGoodsAction } from "./actions";

export default async function MyRecentGoodsPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect_to=/my_recent_goods");
  const goods = await getRecentViewedGoods(session.userId, await getCachedShopConfig());

  return (
    <div id="contents">
      <h2 className="contentTitle">최근 본 상품</h2>
      <div className="empty30" />
      {goods.length === 0 ? <div className="emptyList">최근 본 상품이 없습니다.</div> : (
        <div className="recent_goods clearfix">
          {goods.map((item) => (
            <div key={item.uid} className="goodsItemBox" style={{ position: "relative" }}>
              <GoodsCard goods={item} itemClassName="goodsItem goodsItem6" />
              <form action={deleteRecentViewedGoodsAction}>
                <input type="hidden" name="goodsUid" value={item.uid} />
                <button type="submit" aria-label={`${item.name} 기록 삭제`}>×</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
