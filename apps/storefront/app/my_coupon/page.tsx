import { redirect } from "next/navigation";
import { getMyCouponHistory } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";

const STATUS_LABEL: Record<string, string> = { available: "사용가능", used: "사용완료", expired: "만료" };

function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString("ko-KR");
}

// Port of php/my_coupon.php's 사용가능/사용완료/만료 tabs.
export default async function MyCouponPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login?redirect_to=/my_coupon");

  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "used" || tabParam === "expired" ? tabParam : "available";

  const coupons = await getMyCouponHistory(session.userId);
  const filtered = coupons.filter((c) => c.status === tab);

  return (
    <div id="contents">
      <h2 className="contentTitle">쿠폰함</h2>
      <div className="empty20" />
      <div>
        {(["available", "used", "expired"] as const).map((t) => (
          <a key={t} href={`/my_coupon?tab=${t}`} style={{ marginRight: 12, fontWeight: tab === t ? "bold" : "normal" }}>
            {STATUS_LABEL[t]} ({coupons.filter((c) => c.status === t).length})
          </a>
        ))}
      </div>
      <div className="empty20" />
      {filtered.length === 0 ? (
        <div className="emptyList">해당 쿠폰이 없습니다.</div>
      ) : (
        <ul>
          {filtered.map((c) => (
            <li key={c.couponUid} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
              <div>
                <b>{c.name}</b> — {c.discountType === "P" ? `${c.discount}%` : `${c.discount.toLocaleString("en-US")}원`}
              </div>
              <div className="size12 colorGray">
                {c.eDate && `유효기간: ${formatDate(Math.floor(c.eDate.getTime() / 1000))}`}
                {tab === "used" && c.usedate > 0 && ` · 사용일: ${formatDate(c.usedate)}`}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
