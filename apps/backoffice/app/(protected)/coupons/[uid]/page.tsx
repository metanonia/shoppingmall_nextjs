import { notFound } from "next/navigation";
import { getCouponManagerList } from "@shoppingmall/core";
import { CouponManagerForm } from "@/components/CouponManagerForm";

export default async function EditCouponPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid: uidParam } = await params;
  const uid = Number(uidParam);
  if (!Number.isInteger(uid)) notFound();

  const coupons = await getCouponManagerList();
  const coupon = coupons.find((c) => c.uid === uid);
  if (!coupon) notFound();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>쿠폰 수정 — {coupon.name}</h1>
      <CouponManagerForm initial={coupon} />
    </div>
  );
}
