import { CouponManagerForm } from "@/components/CouponManagerForm";

export default function NewCouponPage() {
  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>쿠폰 등록</h1>
      <CouponManagerForm initial={null} />
    </div>
  );
}
