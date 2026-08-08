import { getVendorSalesCalculateList } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export default async function VendorSettlementPage() {
  const session = await requireVendor();
  const history = await getVendorSalesCalculateList(session.vendorId ?? "");

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>정산 내역</h1>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>기간</th>
            <th>상품금액</th>
            <th>수수료</th>
            <th>정산액</th>
            <th>입금계좌</th>
            <th>확정일</th>
            <th>세금계산서</th><th>정산상태</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.uid}>
              <td>{h.dateFrom} ~ {h.dateTo}</td>
              <td>{formatWon(h.goodsTotal)}원</td>
              <td>{formatWon(h.commissionTotal)}원</td>
              <td>{formatWon(h.payoutTotal)}원</td>
              <td>{h.bankName} {h.bankNum} ({h.bankOwner})</td>
              <td>{new Date(h.signdate * 1000).toLocaleDateString("ko-KR")}</td>
              <td>{h.taxBill ? "발행완료" : "미발행"}</td><td>{h.status ? `정산완료${h.statusDate ? ` (${new Date(h.statusDate * 1000).toLocaleDateString("ko-KR")})` : ""}` : "대기중"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {history.length === 0 && <div style={{ color: "#999", marginTop: 12 }}>정산 내역이 없습니다.</div>}
    </div>
  );
}
