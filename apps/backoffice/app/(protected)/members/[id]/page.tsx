import { notFound } from "next/navigation";
import { getCouponManagerOptions, getMemberProfile, getMileageHistory } from "@shoppingmall/core";
import { AdjustMileageForm, IssueCouponForm } from "@/components/MemberAdjustments";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, mileageHistory, coupons] = await Promise.all([getMemberProfile(id), getMileageHistory(id), getCouponManagerOptions()]);
  if (!profile) notFound();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>
        {profile.name} ({profile.id})
      </h1>
      <div style={{ color: "#999", fontSize: 12, marginBottom: 20 }}>
        등급 {profile.level} · 마일리지 {profile.mileage.toLocaleString("en-US")}원 · {profile.email} · {profile.cell}
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16 }}>쿠폰 발급</h3>
        <IssueCouponForm memberId={profile.id} coupons={coupons} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16 }}>마일리지 조정</h3>
        <AdjustMileageForm memberId={profile.id} />
      </div>

      <h3 style={{ fontSize: 16 }}>마일리지 내역</h3>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>내용</th>
            <th>적립</th>
            <th>사용</th>
            <th>주문번호</th>
            <th>일시</th>
          </tr>
        </thead>
        <tbody>
          {mileageHistory.map((h, i) => (
            <tr key={i}>
              <td>{h.content}</td>
              <td>{h.mileage > 0 ? h.mileage.toLocaleString("en-US") : "-"}</td>
              <td>{h.useMileage > 0 ? h.useMileage.toLocaleString("en-US") : "-"}</td>
              <td>{h.orderNum || "-"}</td>
              <td>{new Date(h.signdate * 1000).toLocaleDateString("ko-KR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
