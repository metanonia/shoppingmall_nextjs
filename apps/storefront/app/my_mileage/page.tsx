import { redirect } from "next/navigation";
import { getMemberProfile, getMileageHistory } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";

function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString("ko-KR");
}

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// Port of php/my_mileage.php's 적립/사용 내역.
export default async function MyMileagePage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect_to=/my_mileage");

  const [profile, history] = await Promise.all([getMemberProfile(session.userId), getMileageHistory(session.userId)]);
  const balance = profile?.mileage ?? 0;

  return (
    <div id="contents">
      <h2 className="contentTitle">마일리지 내역</h2>
      <div className="empty20" />
      <p>
        보유 마일리지: <b>{formatWon(balance)}</b>
      </p>
      <div className="empty20" />
      {history.length === 0 ? (
        <div className="emptyList">마일리지 내역이 없습니다.</div>
      ) : (
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>내용</th>
              <th>적립</th>
              <th>사용</th>
              <th>주문번호</th>
              <th>일자</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={i}>
                <td>{h.content}</td>
                <td>{h.mileage > 0 ? `+${formatWon(h.mileage)}` : "-"}</td>
                <td>{h.useMileage > 0 ? `-${formatWon(h.useMileage)}` : "-"}</td>
                <td>{h.orderNum || "-"}</td>
                <td>{formatDate(h.signdate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
