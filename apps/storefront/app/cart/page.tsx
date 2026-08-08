import { getActiveEventDiscounts, getCart, priceLimitConfigFrom } from "@shoppingmall/core";
import { getCachedMemberDiscountPct, getCachedShopConfig } from "@/lib/request";
import { getSession } from "@/lib/auth";
import { getCartId } from "@/lib/cart-id";
import { CartList } from "@/components/CartList";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// Port of php/cart.php. Legacy's per-vendor grouping and delivery-fee
// preview are shown on /order instead (getCartSummary) — this page mirrors
// cart.php's own scope, which is just the item list + selection.
export default async function CartPage() {
  const session = await getSession();
  const [config, memberDiscountPct] = await Promise.all([getCachedShopConfig(), getCachedMemberDiscountPct()]);
  const cartId = await getCartId(session?.userId ?? null);

  const [eventDiscounts, priceLimitConfig] = await Promise.all([getActiveEventDiscounts(), Promise.resolve(priceLimitConfigFrom(config))]);
  const lines = await getCart(cartId, eventDiscounts, priceLimitConfig, memberDiscountPct);

  const selectedTotal = lines.filter((l) => l.selected && !l.soldOut).reduce((sum, l) => sum + l.lineTotal, 0);
  const selectedCount = lines.filter((l) => l.selected && !l.soldOut).length;

  return (
    <div id="contents">
      <h2 className="contentTitle">장바구니</h2>
      <div className="empty30" />
      <CartList lines={lines} />
      <div className="empty30" />
      <div className="totalPrice">
        선택상품 합계 <span className="total_price">{formatWon(selectedTotal)}</span>원
      </div>
      <div className="empty20" />
      {selectedCount > 0 ? (
        <><a className="shineButtonBlack" href="/order">선택상품 주문하기 ({selectedCount})</a>{config.naverPayUsed && config.naverPayShopId && config.naverPayCertKey && <a href="/api/naverpay/cart" target="_blank" rel="noreferrer" style={{ display: "inline-block", marginLeft: 8, background: "#03c75a", color: "white", padding: "12px 20px" }}>N Pay 구매</a>}</>
      ) : (
        <button className="shineButtonBlack" type="button" disabled>
          선택상품 주문하기
        </button>
      )}
    </div>
  );
}
