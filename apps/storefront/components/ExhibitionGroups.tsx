import type { GoodsCardViewModel } from "@shoppingmall/core";
import { GoodsCard } from "./GoodsCard";

// Port of exhibition.html:8-79's per-`ecate` sub-collection tabs
// (`#contentMenu_{{k}}`). Legacy scrolls to each group's anchor on click;
// this is simpler since every group just renders in place — the tabs are a
// jump-to-section index, not a show/hide switcher (unlike the home page's
// category tabs), so no active-tab state is needed.
export function ExhibitionGroups({ groups }: { groups: { ecate: number; name: string; goods: GoodsCardViewModel[] }[] }) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.ecate} id={`contentMenu_${group.ecate}`} className="empty40">
          <h3 className="sub_title">{group.name}</h3>
          <div className="empty20" />
          {group.goods.length === 0 ? (
            <div className="emptyList">등록된 상품이 없습니다.</div>
          ) : (
            group.goods.map((g) => (
              <div key={g.uid} className="goodsItemBox">
                <GoodsCard goods={g} itemClassName="goodsItem goodsItem4" />
              </div>
            ))
          )}
        </div>
      ))}
    </>
  );
}
