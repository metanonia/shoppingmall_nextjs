import { notFound } from "next/navigation";
import { STATUS_LABELS, getAdminOrderDetail } from "@shoppingmall/core";
import {
  CancelOrderButton,
  ConfirmBankTransferButton,
  DeliveryProgressForm,
  LineStatusActions,
  OrderAddressForm,
  OrderMemoForm,
} from "@/components/OrderActions";

const PAY_TYPE_LABELS: Record<string, string> = { B: "무통장입금", C: "카드", R: "실시간계좌이체", V: "가상계좌", H: "휴대폰", M: "마일리지" };
const PAY_STATUS_LABELS: Record<string, string> = { A: "입금대기", B: "미확인", C: "결제완료", D: "결제실패" };

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function formatDate(signdate: number): string {
  return new Date(signdate * 1000).toLocaleString("ko-KR");
}

export default async function OrderDetailPage({ params }: { params: Promise<{ orderNum: string }> }) {
  const { orderNum } = await params;
  const order = await getAdminOrderDetail(orderNum);
  if (!order) notFound();

  const payStatusC = order.payStatus === "C";

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>주문 {order.orderNum}</h1>
      <div style={{ color: "#999", fontSize: 12, marginBottom: 20 }}>{formatDate(order.signdate)}</div>

      <div style={{ display: "flex", gap: 40, marginBottom: 24 }}>
        <div>
          <div>
            <b>{order.name}</b> ({order.buyerId}) / {order.cell} / {order.email}
          </div>
          <div style={{ marginTop: 8 }}>
            수령인: {order.name2} / {order.cell2}
          </div>
          <div className="empty10" />
          <OrderAddressForm orderNum={order.orderNum} postcode={order.postcode} address1={order.address1} address2={order.address2} />
        </div>
        <div>
          <div>결제수단: {PAY_TYPE_LABELS[order.payType] ?? order.payType}</div>
          <div>결제상태: {PAY_STATUS_LABELS[order.payStatus] ?? order.payStatus}</div>
          <div>결제금액: {formatWon(order.payTotal)}원</div>
          <div>배송비: {formatWon(order.deliveryTotal)}원</div>
          <div>취소액: {formatWon(order.cancelTotal)}원</div>
          <div>환불액: {formatWon(order.refundTotal)}원</div>
          <div className="empty10" />
          {order.payType === "B" && order.payStatus !== "C" && <ConfirmBankTransferButton orderNum={order.orderNum} />}
          <CancelOrderButton orderNum={order.orderNum} payStatus={order.payStatus} />
        </div>
      </div>

      <table style={{ width: "100%", marginBottom: 12 }}>
        <thead>
          <tr>
            <th>상품</th>
            <th>수량</th>
            <th>금액</th>
            <th>상태</th>
            <th>송장</th>
            <th>처리</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line) => (
            <tr key={line.ogUid}>
              <td>
                {line.goodsName} {line.optionValue && `(${line.optionValue})`}
              </td>
              <td>{line.qty}</td>
              <td>{formatWon(line.lineTotal)}원</td>
              <td>{STATUS_LABELS[line.status] ?? line.statusLabel}</td>
              <td>{line.deliveryInfo || "-"}</td>
              <td>
                <LineStatusActions orderNum={order.orderNum} line={line} payStatusC={payStatusC} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <DeliveryProgressForm orderNum={order.orderNum} lines={order.lines} />

      <div style={{ marginTop: 24 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>관리자 메모</div>
        <OrderMemoForm orderNum={order.orderNum} memo={order.memo} />
      </div>
    </div>
  );
}
