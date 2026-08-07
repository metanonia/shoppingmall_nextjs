import type { GoodsCardViewModel } from "@shoppingmall/core";
import { GoodsCard } from "./GoodsCard";

// Port of list.html:163-189 / mobile_list.html:168-194's `loop_list` /
// `empty_list` plain grid (no carousel — this is the paginated results list,
// not a home-page swiper section).
export function GoodsGrid({
  goods,
  device,
  emptyMessage = "등록된 상품이 없거나 선택한 조건에 맞는 상품이 없습니다.",
}: {
  goods: GoodsCardViewModel[];
  device: "pc" | "mobile";
  emptyMessage?: string;
}) {
  if (goods.length === 0) {
    return <div className="emptyList fontSCDream weight300">{emptyMessage}</div>;
  }

  return (
    <div id="listArea">
      {goods.map((g) => (
        <div key={g.uid} className={device === "mobile" ? "goodsItemBox goodsItemBox2" : "goodsItemBox"}>
          <GoodsCard goods={g} itemClassName={device === "mobile" ? "goodsItem" : "goodsItem goodsItem4"} spacer={device === "mobile" ? "empty1" : undefined} />
        </div>
      ))}
    </div>
  );
}
