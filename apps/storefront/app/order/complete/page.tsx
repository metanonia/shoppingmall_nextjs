import { notFound } from "next/navigation";
import { getOrderConfirmation, getOrderDetail } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";

const PAY_TYPE_LABELS: Record<string, string> = { B: "무통장입금", C: "카드", H: "휴대폰", M: "마일리지 결제" };

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// Port of php/order_ok.php.
export default async function OrderCompletePage({ searchParams }: { searchParams: Promise<{ order_num?: string }> }) {
  const { order_num: orderNum } = await searchParams;
  if (!orderNum) notFound();

  const session = await getSession();
  const detail = session ? await getOrderDetail(orderNum, { memberId: session.userId }) : null;
  const confirmation = detail ?? (await getOrderConfirmation(orderNum));
  if (!confirmation) notFound();

  return (
    <div id="contents">
      <h2 className="contentTitle">주문이 완료되었습니다</h2>
      <div className="empty30" />
      <div className="totalPrice">
        주문번호 <span className="total_price">{confirmation.orderNum}</span>
      </div>
      <div className="empty20" />
      <p>
        결제수단: {PAY_TYPE_LABELS[confirmation.payType] ?? confirmation.payType}
        <br />
        결제금액: {formatWon(confirmation.payTotal)}원 (배송비 {formatWon(confirmation.deliveryTotal)}원 포함)
      </p>
      {confirmation.payType === "B" && (
        <p className="colorGray size12">
          입금계좌: {confirmation.bankAccount ?? "-"}
          <br />
          입금자명: {confirmation.remitterName ?? "-"}
          <br />
          입금 확인 후 결제완료로 처리됩니다. 주문내역은 {session ? "마이페이지" : "비회원 주문조회"}에서 확인하실 수
          있습니다.
        </p>
      )}
      <div className="empty30" />
      <a className="shineButtonBlack" href={session ? "/my_order" : "/my_order/guest"}>
        주문내역 확인
      </a>
    </div>
  );
}
