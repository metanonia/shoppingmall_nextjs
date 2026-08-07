import type { StoreInfo } from "@shoppingmall/core";
import { toggleFavoriteStoreAction } from "@/app/store/actions";

// Port of store.html:1-72 / mobile_store.html:1-71's `.storeMenu` info panel.
// Review star breakdown is always zero — see getStoreInfo's comment (no
// mallRN_review table yet, needs an order to point at). Favorite-store count
// is real; the toggle button is a plain <form> server action, so no client
// component is needed here. The hover-to-reveal storeInfo/storeCS panels are
// plain CSS `:hover` in the legacy stylesheet (no JS needed there either).
export function StoreHeader({
  store,
  isMember,
  isFavorited,
}: {
  store: StoreInfo;
  isMember: boolean;
  isFavorited: boolean;
}) {
  return (
    <h2 className="contentTitle">
      <a href={`/store?vendor=${store.vendorId}`}>{store.storeName}</a>
      <div className="storeMenu">
        <ul>
          <li className="first line info">
            판매자 정보
            <div className="storeInfo">
              <div>
                <span>상호</span> <span>{store.compName}</span>
              </div>
              <div>
                <span>대표자</span> <span>{store.compOwner}</span>
              </div>
              <div>
                <span>팩스번호</span> <span>{store.compFax}</span>
              </div>
              <div>
                <span>이메일</span> <span>{store.compEmail}</span>
              </div>
              <div>
                <span>사업자번호</span> <span>{store.compLicenseNo}</span>
              </div>
              <div>
                <span>주소지</span> <span>{store.compAddress}</span>
              </div>
            </div>
          </li>
          <li className="first line cs">
            고객센터
            <div className="storeCS">
              <div>
                <span>연락처</span> <span>{store.compTel}</span>
              </div>
              <div>
                <span>평일</span> <span>{store.csTime1}</span>
              </div>
              <div>
                <span>토요일</span> <span>{store.csTime2}</span>
              </div>
              <div>
                <span>휴일</span> <span>{store.csTime3}</span>
              </div>
              <div>
                <span>점심시간</span> <span>{store.csTime4}</span>
              </div>
            </div>
          </li>
          <li className="first line star">
            <div className="starsTtl">구매만족도</div>
            <div className="storeStars">
              <div className="leftBox">
                <div className="star">{store.starsAvg}</div>
              </div>
            </div>
          </li>
          <li className="left">
            {isMember ? (
              <form action={toggleFavoriteStoreAction} style={{ display: "inline" }}>
                <input type="hidden" name="vendor" value={store.vendorId} />
                <button type="submit" aria-label="관심스토어등록" style={{ background: "none", border: 0 }}>
                  <i className={isFavorited ? "xi-heart xi-x colorOrange" : "xi-heart-o xi-x"} title="관심스토어등록" />
                </button>
              </form>
            ) : (
              <a href={`/login?redirect_to=/store?vendor=${store.vendorId}`} title="관심스토어등록">
                <i className="xi-heart-o xi-x" />
              </a>
            )}{" "}
            <b className="favStoreCnt">{store.favoriteCount}</b>
          </li>
        </ul>
      </div>
    </h2>
  );
}
