import type { GoodsCardViewModel } from "@shoppingmall/core";

// Port of the <li> markup repeated in main.html:113-137 (PC) and
// mobile_main.html:44-69 (mobile) for each `loop_goods_item` / `loop_cate_goods_item`
// slide. The only structural difference between devices is an extra empty spacer
// div before the struck-through original price on mobile.
export function GoodsCard({
  goods,
  spacer,
  itemClassName = "goodsItem",
}: {
  goods: GoodsCardViewModel;
  spacer?: string;
  itemClassName?: string;
}) {
  return (
    <div className={itemClassName}>
      <ul>
        <li>
          <a href={goods.link}>
            <img src={goods.image} alt={goods.name} height={285} />
          </a>
          {goods.soldOut && <span className="soldoutIcon">품절</span>}
        </li>
        <li>
          <a href={goods.link}>{goods.nameCodeAble}</a>
        </li>
        <li>
          <div>￦{goods.price}</div>
          {goods.hasCoupon && <div className="couponIcon">쿠폰</div>}
          {goods.salePct != null && (
            <div className="salePrice">
              {goods.salePct}%&nbsp;<i className="xi-arrow-down" />
            </div>
          )}
          {goods.origPrice != null && (
            <>
              {spacer && <div className={spacer} />}
              <div className="origPrice">
                <s>{goods.origPrice}</s>
              </div>
            </>
          )}
        </li>
        <li>
          {goods.icons.map((icon) => (
            <img key={icon} src={`/image/icon/${icon}`} alt="icon" />
          ))}
        </li>
      </ul>
    </div>
  );
}
