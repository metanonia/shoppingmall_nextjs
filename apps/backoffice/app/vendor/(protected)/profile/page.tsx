import { getVendorInfo } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";
import { VendorInfoForm, VendorPasswordForm } from "@/components/VendorInfoForm";

const AUTH_LABELS: Record<string, string> = { R: "승인대기", Y: "승인완료", N: "거절" };
const SELL_LABELS: Record<string, string> = { A: "판매허용", R: "판매준비", N: "판매중지" };
const GOODS_AUTH_LABELS: Record<string, string> = { A: "자동승인", P: "관리자수동승인" };
const DELIVERY_TYPE_LABELS: Record<number, string> = { 0: "판매자배송", 1: "본사배송" };

export default async function VendorProfilePage() {
  const session = await requireVendor();
  const info = await getVendorInfo(session.vendorId ?? "");
  if (!info) return <div>입점사 정보를 찾을 수 없습니다.</div>;

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>업체정보관리</h1>

      <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 6, marginBottom: 20, fontSize: 13, color: "#666" }}>
        <div>아이디: {info.id}</div>
        <div>승인상태: {AUTH_LABELS[info.auth]}</div>
        <div>판매상태: {SELL_LABELS[info.sell]}</div>
        <div>상품승인방식: {GOODS_AUTH_LABELS[info.goodsAuth]}</div>
        <div>배송방식: {DELIVERY_TYPE_LABELS[info.deliveryType] ?? info.deliveryType}</div>
        <div>수수료율: {info.commission}%</div>
        <div>정산주기: 월 {info.accountCycle}회</div>
        <div style={{ color: "#999", marginTop: 6 }}>위 항목은 관리자만 변경할 수 있습니다.</div>
      </div>

      <VendorInfoForm info={info} vendorId={info.id} />

      <div className="empty30" />
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>비밀번호 변경</h2>
      <VendorPasswordForm />
    </div>
  );
}
