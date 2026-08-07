import { GuestOrderLookup } from "@/components/GuestOrderLookup";

// Guest twin of /my_order — see order.ts's getOrderDetail comment on scope.
export default function GuestOrderPage() {
  return (
    <div id="contents">
      <h2 className="contentTitle">비회원 주문조회</h2>
      <div className="empty30" />
      <GuestOrderLookup />
    </div>
  );
}
