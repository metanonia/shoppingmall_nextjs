import { notFound } from "next/navigation";
import { getAdminVendorByUid, getVendorSalesCalculateList, getVendorSalesPreview } from "@shoppingmall/core";
import { ConfirmSettlementForm } from "@/components/SettlementForm";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function VendorSettlementPage({
  params,
  searchParams,
}: {
  params: Promise<{ uid: string }>;
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>;
}) {
  const { uid: uidParam } = await params;
  const vendorUid = Number(uidParam);
  if (!Number.isInteger(vendorUid)) notFound();

  const vendor = await getAdminVendorByUid(vendorUid);
  if (!vendor) notFound();

  const { dateFrom = today(), dateTo = today() } = await searchParams;
  const [preview, history] = await Promise.all([
    getVendorSalesPreview(vendor.id, dateFrom, dateTo),
    getVendorSalesCalculateList(vendor.id),
  ]);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>정산 — {vendor.compName} ({vendor.id})</h1>
      <div className="empty20" />

      <form method="get" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <input type="date" name="dateFrom" defaultValue={dateFrom} />
        ~
        <input type="date" name="dateTo" defaultValue={dateTo} />
        <button type="submit">조회</button>
      </form>

      <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 6, marginBottom: 16 }}>
        <div>대상 매출 라인: {preview.lineCount}건</div>
        <div>상품금액 합계: {formatWon(preview.goodsTotal)}원</div>
        <div>수수료 합계: {formatWon(preview.commissionTotal)}원</div>
        <div style={{ fontWeight: 600 }}>정산 예정액: {formatWon(preview.payoutTotal)}원</div>
      </div>

      {preview.lineCount > 0 && (
        <ConfirmSettlementForm
          vendorUid={vendor.uid}
          dateFrom={dateFrom}
          dateTo={dateTo}
          bankName={vendor.bankName}
          bankNum={vendor.bankNum}
          bankOwner={vendor.bankOwner}
        />
      )}

      <div className="empty30" />
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>정산 이력</h2>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>기간</th>
            <th>상품금액</th>
            <th>수수료</th>
            <th>정산액</th>
            <th>입금계좌</th>
            <th>확정일</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
