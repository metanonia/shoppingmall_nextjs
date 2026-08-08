import { notFound } from "next/navigation";
import { STATUS_LABELS, getVendorOrderDetail } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";
import { VendorDeliveryProgressForm, VendorLineStatusActions } from "@/components/VendorOrderActions";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function formatDate(signdate: number): string {
  return new Date(signdate * 1000).toLocaleString("ko-KR");
}

export default async function VendorOrderDetailPage({ params }: { params: Promise<{ orderNum: string }> }) {
  const session = await requireVendor();
  const { orderNum } = await params;
  const order = await getVendorOrderDetail(session.vendorId ?? "", orderNum);
  if (!order) notFound();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>주문 {order.orderNum}</h1>
      <div style={{ color: "#999", fontSize: 12, marginBottom: 20 }}>{formatDate(order.signdate)}</div>

      <div style={{ marginBottom: 24 }}>
        <div>
          <b>{order.buyerName}</b>
        </div>
        <div style={{ marginTop: 8 }}>
          수령인: {order.receiverName} / {order.receiverCell}
        </div>
        <div>
          배송지: [{order.postcode}] {order.address1} {order.address2}
        </div>
        {order.message && <div>배송메시지: {order.message}</div>}
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
                <VendorLineStatusActions orderNum={order.orderNum} line={line} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <VendorDeliveryProgressForm orderNum={order.orderNum} lines={order.lines} />
    </div>
  );
}
