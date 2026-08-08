import { getCouponManagerList } from "@shoppingmall/core";

function formatDate(d: Date | null): string {
  if (!d || d.getFullYear() <= 1000) return "-";
  return d.toLocaleDateString("ko-KR");
}

export default async function CouponsPage() {
  const coupons = await getCouponManagerList();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20 }}>쿠폰관리</h1>
        <a href="/coupons/new">
          <button type="button">쿠폰 등록</button>
        </a>
      </div>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>쿠폰명</th>
            <th>할인</th>
            <th>할인한도</th>
            <th>유효기간</th>
            <th>1인당 발급한도</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((c) => (
            <tr key={c.uid}>
              <td>{c.name}</td>
              <td>{c.discountType === "P" ? `${c.discount}%` : `${c.discount.toLocaleString("en-US")}원`}</td>
              <td>{c.discountLimit > 0 ? `${c.discountLimit.toLocaleString("en-US")}원` : "-"}</td>
              <td>{c.useType === 0 ? `${formatDate(c.useSDate)} ~ ${formatDate(c.useEDate)}` : `발급일로부터 ${c.useDay}일`}</td>
              <td>{c.useLimit > 0 ? `${c.useLimit}회` : "무제한"}</td>
              <td>
                <a href={`/coupons/${c.uid}`}>수정</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {coupons.length === 0 && <div style={{ color: "#999", marginTop: 12 }}>등록된 쿠폰이 없습니다.</div>}
    </div>
  );
}
