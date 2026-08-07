import {
  calcCouponDiscount,
  getActiveEventDiscounts,
  getCartSummary,
  getMemberProfile,
  getMileageBalance,
  getMyCoupons,
  priceLimitConfigFrom,
  validateAndSyncCart,
} from "@shoppingmall/core";
import { getSession } from "@/lib/auth";
import { getCartId } from "@/lib/cart-id";
import { getCachedMemberDiscountPct, getCachedShopConfig } from "@/lib/request";
import { OrderForm } from "@/components/OrderForm";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// Port of php/order.php. `direct=1` scopes to the "바로구매" cart row; the
// default (no query) scopes to whatever's checked in /cart (selects=1).
export default async function OrderPage({ searchParams }: { searchParams: Promise<{ direct?: string }> }) {
  const { direct: directParam } = await searchParams;
  const direct = directParam === "1";

  const session = await getSession();
  const cartId = await getCartId(session?.userId ?? null);

  const sync = await validateAndSyncCart(cartId, direct);

  const [config, memberDiscountPct] = await Promise.all([getCachedShopConfig(), getCachedMemberDiscountPct()]);
  const eventDiscounts = await getActiveEventDiscounts();
  const priceLimitConfig = priceLimitConfigFrom(config);

  const summary = await getCartSummary(cartId, direct, config, eventDiscounts, priceLimitConfig, memberDiscountPct);

  const [profile, coupons, mileageBalance] = await Promise.all([
    session ? getMemberProfile(session.userId) : Promise.resolve(null),
    session ? getMyCoupons(session.userId) : Promise.resolve([]),
    session ? getMileageBalance(session.userId) : Promise.resolve(0),
  ]);

  return (
    <div id="contents">
      <h2 className="contentTitle">주문서 작성</h2>
      <div className="empty30" />

      {!sync.ok && <div className="colorRed">주문 가능한 상품이 없습니다. 장바구니를 다시 확인해주세요.</div>}
      {(sync.removed.length > 0 || sync.adjusted.length > 0) && (
        <div className="colorRed">
          일부 상품의 재고/판매 상태가 변경되었습니다 ({[...sync.removed, ...sync.adjusted].join(", ")}). 장바구니를
          다시 확인해주세요.
        </div>
      )}

      {sync.ok && (
        <>
          <table style={{ width: "100%" }}>
            <tbody>
              {summary.lines.map((line) => (
                <tr key={line.cartUid}>
                  <td>
                    {line.goodsName} {line.optionValue && `(${line.optionValue})`} x {line.qty}
                  </td>
                  <td>{formatWon(line.lineTotal)}원</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="empty20" />

          <OrderForm
            direct={direct}
            subtotal={summary.subtotal}
            deliveryTotal={summary.deliveryTotal}
            coupons={coupons
              .filter((c) => c.goodsUid === 0 && (c.useLimit === 0 || summary.subtotal >= c.useLimit))
              .map((c) => ({
                couponUid: c.couponUid,
                name: c.name,
                discountAmount: calcCouponDiscount(summary.subtotal, c.discount, c.discountType, c.discountLimit),
              }))}
            mileageBalance={mileageBalance}
            isMember={Boolean(session)}
            defaultName={profile?.name ?? ""}
            defaultCell={profile?.cell ?? ""}
            defaultEmail={profile?.email ?? ""}
            defaultPostcode={profile?.postcode ?? ""}
            defaultAddress1={profile?.address1 ?? ""}
            defaultAddress2={profile?.address2 ?? ""}
            bankTransferEnabled={config.paymentTypeB === 1}
            cardEnabled={config.paymentTypeC === 1}
            phoneEnabled={config.paymentTypeH === 1}
            mileageOnlyEnabled={Boolean(session)}
          />
        </>
      )}
    </div>
  );
}
