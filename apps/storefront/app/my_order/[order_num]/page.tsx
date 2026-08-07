import { notFound, redirect } from "next/navigation";
import { getOrderDetail } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";
import { CancelOrderButton } from "@/components/CancelOrderButton";

const PAY_TYPE_LABELS: Record<string, string> = { B: "무통장입금", C: "카드", R: "실시간계좌이체", V: "가상계좌", H: "휴대폰", M: "마일리지" };
const PAY_STATUS_LABELS: Record<string, string> = { A: "진행중", B: "가상계좌발급완료", C: "결제성공", D: "결제실패" };

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// Port of php/order_detail.php, member path (guest path is
// /my_order/guest/[order_num]).
export default async function MyOrderDetailPage({ params }: { params: Promise<{ order_num: string }> }) {
  const { order_num: orderNum } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?redirect_to=/my_order/${orderNum}`);

  const detail = await getOrderDetail(orderNum, { memberId: session.userId });
  if (!detail) notFound();

  const canCancel = detail.lines.some((l) => l.status !== 9);

  return (
    <div id="contents">
      <h2 className="contentTitle">주문상세</h2>
      <div className="empty30" />

      <div className="sub_title">주문번호 {detail.orderNum}</div>
      <p>
        결제수단: {PAY_TYPE_LABELS[detail.payType] ?? detail.payType} / 결제상태:{" "}
        {PAY_STATUS_LABELS[detail.payStatus] ?? detail.payStatus}
      </p>

      <div className="empty20" />
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>상품</th>
            <th>수량</th>
            <th>금액</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          {detail.lines.map((line) => (
            <tr key={line.ogUid}>
              <td>
                {line.goodsName} {line.optionValue && `(${line.optionValue})`}
              </td>
              <td>{line.qty}</td>
              <td>{formatWon(line.lineTotal)}원</td>
              <td>{line.statusLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="empty20" />
      <p>
        배송비: {formatWon(detail.deliveryTotal)}원
        {detail.useCoupon > 0 && <> / 쿠폰할인: {formatWon(detail.useCoupon)}원</>}
        {detail.useMileage > 0 && <> / 마일리지 사용: {formatWon(detail.useMileage)}원</>}
      </p>
      <div className="totalPrice">
        결제금액 <span className="total_price">{formatWon(detail.payTotal)}</span>원
      </div>

      <div className="empty20" />
      <div className="sub_title">배송지</div>
      <p>
        {detail.name2} ({detail.cell2})
        <br />
        [{detail.postcode}] {detail.address1} {detail.address2}
        {detail.message && (
          <>
            <br />
            요청사항: {detail.message}
          </>
        )}
      </p>

      {canCancel && (
        <>
          <div className="empty20" />
          <CancelOrderButton orderNum={detail.orderNum} />
        </>
      )}
    </div>
  );
}
