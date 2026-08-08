import { notFound } from "next/navigation";
import { getAdminOrderDetail } from "@shoppingmall/core";
import { PartialRefundForm } from "@/components/PartialRefundForm";

export default async function OrderRefundPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNum: string }>;
  searchParams: Promise<{ ogUid?: string }>;
}) {
  const { orderNum } = await params;
  const { ogUid: ogUidParam } = await searchParams;
  const ogUid = Number(ogUidParam);
  if (!Number.isInteger(ogUid)) notFound();

  const order = await getAdminOrderDetail(orderNum);
  if (!order || order.payStatus !== "C") notFound();

  const line = order.lines.find((l) => l.ogUid === ogUid);
  if (!line) notFound();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>부분환불 — {order.orderNum}</h1>
      <div style={{ color: "#999", fontSize: 12, marginBottom: 20 }}>
        {line.goodsName} {line.optionValue && `(${line.optionValue})`} x {line.qty}
      </div>
      <PartialRefundForm orderNum={order.orderNum} ogUid={ogUid} />
      <div className="empty20" />
      <a href={`/orders/${order.orderNum}`} style={{ fontSize: 12, color: "#999" }}>
        ← 주문 상세로
      </a>
    </div>
  );
}
