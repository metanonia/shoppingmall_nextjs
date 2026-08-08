"use client";

import { useState } from "react";
import type { DownloadableCoupon, GoodsDetailViewModel, InquiryItem, ReviewItem } from "@shoppingmall/core";
import { toggleFavoriteGoodsAction, toggleFavoriteStoreAction } from "@/app/goods/[uid]/actions";
import { GoodsCard } from "./GoodsCard";
import { ProductGallery } from "./ProductGallery";
import { InquiryPanel } from "./InquiryPanel";
import { CartActions } from "./CartActions";
import { CouponDownload } from "./CouponDownload";

export type ProductDetailFavoriteState = {
  isMember: boolean;
  favoritedGoods: boolean;
  favoriteGoodsCount: number;
  favoritedStore: boolean;
  favoriteStoreCount: number;
};

// Port of view.html / mobile_view.html's `.goodsInfo` + `.goods_explain` tab
// panel. Add-to-cart/buy-now (Phase 4) and favorites/inquiry/vendor
// "인기상품", reviews, and inquiries are wired up. Both devices share this
// component; mobile keeps the legacy sticky order drawer interaction.
export function ProductDetail({
  detail,
  device,
  favorite,
  inquiries,
  reviews,
  downloadableCoupons,
  inquiryConfig,
  naverPayEnabled,
}: {
  detail: GoodsDetailViewModel;
  device: "pc" | "mobile";
  favorite: ProductDetailFavoriteState;
  inquiries: InquiryItem[];
  reviews: ReviewItem[];
  downloadableCoupons: DownloadableCoupon[];
  inquiryConfig: { allowGuest: boolean; secretType: number; privacy: boolean; categoryInfo: string; guestAgreement: string };
  naverPayEnabled: boolean;
}) {
  const [tab, setTab] = useState<1 | 2 | 3 | 4>(1);
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false);

  const infoRows: { label: string; value: string }[] = [
    ...(detail.consumerPrice ? [{ label: "소비자가격", value: `${detail.consumerPrice}원` }] : []),
    ...(detail.goodsCode ? [{ label: "상품코드", value: detail.goodsCode }] : []),
    ...(detail.make ? [{ label: "제조사", value: detail.make }] : []),
    ...(detail.brand ? [{ label: "브랜드", value: detail.brand }] : []),
    ...(detail.model ? [{ label: "모델명", value: detail.model }] : []),
    ...(detail.origin ? [{ label: "원산지", value: detail.origin }] : []),
    ...detail.makingInfo.map((m) => ({ label: m.name, value: m.value })),
  ];

  return (
    <div id="contents">
      <div className="empty50" />

      <div className="goodsInfo">
        <ProductGallery images={detail.images} name={detail.name} device={device} />

        <div className="goodsDetail">
          {detail.icons.length > 0 && (
            <div className="goods_icon">
              {detail.icons.map((icon) => (
                <img key={icon} src={`/image/icon/${icon}`} alt="icon" />
              ))}
            </div>
          )}
          <div className="goods_name">
            {detail.nameCodeAble}
            {favorite.isMember ? (
              <form action={toggleFavoriteGoodsAction} style={{ display: "inline" }}>
                <input type="hidden" name="goodsUid" value={detail.uid} />
                <input type="hidden" name="vendor" value={detail.vendor} />
                <button
                  type="submit"
                  aria-label="찜하기"
                  style={{ background: "none", border: 0, marginLeft: 6, verticalAlign: "middle" }}
                >
                  <i className={favorite.favoritedGoods ? "xi-heart colorOrange" : "xi-heart-o"} />
                </button>
              </form>
            ) : (
              <a href={`/login?redirect_to=/goods/${detail.uid}`} aria-label="찜하기" style={{ marginLeft: 6 }}>
                <i className="xi-heart-o" />
              </a>
            )}
            <b className="favGoodsCnt size12"> {favorite.favoriteGoodsCount}</b>
          </div>

          <div className="goods_price">
            <span>{detail.price}</span>원
            {detail.origPrice && (
              <>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <s className="size18 colorGray fontMontserrat">{detail.origPrice}</s>
                {detail.saleMsg && <b className="size14">({detail.saleMsg})</b>}
              </>
            )}
          </div>

          <CouponDownload goodsUid={detail.uid} coupons={downloadableCoupons} isMember={favorite.isMember} />

          <div className="empty20" />

          {infoRows.length > 0 && (
            <ul>
              {infoRows.map((row) => (
                <li key={row.label}>
                  <div>{row.label}</div>
                  <div>{row.value}</div>
                </li>
              ))}
              <li>
                <div>배송비</div>
                <div>{detail.deliveryMessage}</div>
              </li>
              {detail.mileagePct > 0 && (
                <li>
                  <div>적립혜택</div>
                  <div>
                    마일리지 <span>{detail.mileagePct}%</span> 적립
                  </div>
                </li>
              )}
              {detail.limitQty > 0 && (
                <li style={{ height: 20 }}>
                  <div>구매제한</div>
                  <div>
                    회원당 <strong>{detail.limitQty}</strong>개까지 구매가능 합니다.
                  </div>
                </li>
              )}
              <li className="line" />
            </ul>
          )}

          {detail.optionUse && detail.options.length > 0 && (
            <>
              <div className="empty20" />
              <div className="optionList">
                {detail.options.map((group) => (
                  <div key={group.name} className="optionBox">
                    <div className="option_title">
                      <b>{group.name}</b>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="empty20" />
          <div className="totalPrice">
            총 금액 <span className="total_price">{detail.price}</span>원
          </div>
          <div className="empty20" />

          {detail.soldOut ? (
            <button className="shineButton" style={{ width: 433 }} type="button" disabled>
              품절된 상품 입니다.
            </button>
          ) : detail.purchaseBlocked ? (
            <button className="shineButton" style={{ width: 433 }} type="button" disabled>
              {detail.limitMsg}
            </button>
          ) : device === "mobile" ? (
            <><button className="mobileOrderOpen" type="button" onClick={() => setMobileOrderOpen(true)}>구매하기</button>{mobileOrderOpen && <div className="mobileOrderDrawer" role="dialog" aria-label="상품 주문"><button type="button" className="mobileOrderClose" onClick={() => setMobileOrderOpen(false)}>닫기 ×</button><CartActions
              goodsUid={detail.uid}
              optionUse={detail.optionUse}
              options={detail.options}
              optionCombinations={detail.optionCombinations}
              naverPayEnabled={naverPayEnabled}
            /></div>}</>
          ) : (
            <CartActions goodsUid={detail.uid} optionUse={detail.optionUse} options={detail.options} optionCombinations={detail.optionCombinations} naverPayEnabled={naverPayEnabled} />
          )}
        </div>
      </div>

      {detail.relatedGoods.length > 0 && (
        <>
          <div className="empty80" />
          <div className="sub_title">함께보면 좋은상품</div>
          <div className="empty20" />
          {detail.relatedGoods.map((g) => (
            <div key={g.uid} className="goodsItemBox">
              <GoodsCard goods={g} itemClassName="goodsItem goodsItem6" />
            </div>
          ))}
        </>
      )}

      {detail.vendor && detail.vendorGoods.length > 0 && (
        <>
          <div className="empty80" />
          <div className="sub_title">
            <a href={`/store?vendor=${detail.vendor}`}>{detail.vendorName}</a>의 인기상품
            {favorite.isMember ? (
              <form action={toggleFavoriteStoreAction} style={{ display: "inline" }}>
                <input type="hidden" name="vendor" value={detail.vendor} />
                <input type="hidden" name="goodsUid" value={detail.uid} />
                <button type="submit" aria-label="스토어 찜하기" style={{ background: "none", border: 0, marginLeft: 6 }}>
                  <i className={favorite.favoritedStore ? "xi-heart colorOrange" : "xi-heart-o"} />
                </button>
              </form>
            ) : (
              <a href={`/login?redirect_to=/goods/${detail.uid}`} aria-label="스토어 찜하기" style={{ marginLeft: 6 }}>
                <i className="xi-heart-o" />
              </a>
            )}
            <b className="favStoreCnt size12"> {favorite.favoriteStoreCount}</b>
          </div>
          <div className="empty20" />
          {detail.vendorGoods.map((g) => (
            <div key={g.uid} className="goodsItemBox">
              <GoodsCard goods={g} itemClassName="goodsItem goodsItem6" />
            </div>
          ))}
        </>
      )}

      <div className="goods_explain">
        <div className="content_list">
          <div className="contentMenu">
            <ul>
              <li className={tab === 1 ? "contentMenuSub selected" : "contentMenuSub"} onClick={() => setTab(1)}>
                상품상세정보
              </li>
              <li className={tab === 2 ? "contentMenuSub selected" : "contentMenuSub"} onClick={() => setTab(2)}>
                구매후기({detail.reviewCount})
              </li>
              <li className={tab === 3 ? "contentMenuSub selected" : "contentMenuSub"} onClick={() => setTab(3)}>
                상품문의({detail.inquiryCount})
              </li>
              <li className={tab === 4 ? "contentMenuSub selected" : "contentMenuSub"} onClick={() => setTab(4)}>
                배송/교환/반품
              </li>
            </ul>
          </div>
        </div>

        {tab === 1 && (
          <div className="goods_explain_01">
            <div className="empty30" />
            <div className="sub_title">상품상세정보</div>
            <div className="fontSCDream" dangerouslySetInnerHTML={{ __html: detail.detailHtml }} />
            {detail.requireInfo.length > 0 && (
              <table style={{ borderBottom: "1px solid #ccc", width: "100%" }}>
                <tbody>
                  {detail.requireInfo.map((r) => (
                    <tr key={r.name}>
                      <td className="tdType1">{r.name}</td>
                      <td className="tdType2">{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 2 && (
          <div className="goods_explain_02">
            <div className="empty30" />
            <div className="sub_title">구매후기({detail.reviewCount})</div>
            <div className="empty20" />
            {reviews.length === 0 ? (
              <div className="emptyList">아직 등록된 후기가 없습니다.</div>
            ) : (
              <ul>
                {reviews.map((review) => (
                  <li key={review.uid} style={{ borderBottom: "1px solid #eee", padding: "14px 0" }}>
                    <div aria-label={`별점 ${review.stars}점`}>
                      {"★".repeat(review.stars)}{"☆".repeat(5 - review.stars)}
                    </div>
                    <div>{review.content}</div>
                    {review.files.map((filename) => <a key={filename} href={`/uploads/review/${review.uid}/${filename}`} target="_blank" rel="noreferrer">첨부파일</a>)}
                    <div className="colorGray size12">
                      {review.authorName} · {new Date(review.signdate * 1000).toLocaleDateString("ko-KR")}
                      {review.optionName && ` · ${review.optionName}`}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 3 && (
          <div className="goods_explain_03">
            <div className="empty30" />
            <div className="sub_title">상품문의({detail.inquiryCount})</div>
            <div className="empty20" />
            <InquiryPanel goodsUid={detail.uid} isMember={favorite.isMember} inquiries={inquiries} config={inquiryConfig} />
          </div>
        )}

        {tab === 4 && (
          <div className="goods_explain_04">
            <div className="empty30" />
            <div className="sub_title">배송안내</div>
            <div dangerouslySetInnerHTML={{ __html: detail.deliveryInfo }} />
            <div className="empty30" />
            <div className="sub_title">환불안내</div>
            <div dangerouslySetInnerHTML={{ __html: detail.refundInfo }} />
            <div className="empty30" />
            <div className="sub_title">교환안내</div>
            <div dangerouslySetInnerHTML={{ __html: detail.exchangeInfo }} />
            <div className="empty30" />
            <div className="sub_title">AS안내</div>
            <div dangerouslySetInnerHTML={{ __html: detail.asInfo }} />
          </div>
        )}
      </div>
    </div>
  );
}
