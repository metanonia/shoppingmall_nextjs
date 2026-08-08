import { getMemberStats } from "@shoppingmall/core";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function MemberStatsPage({ searchParams }: { searchParams: Promise<{ dateFrom?: string; dateTo?: string }> }) {
  const { dateFrom: dateFromParam, dateTo: dateToParam } = await searchParams;
  const dateFrom = dateFromParam || daysAgoStr(30);
  const dateTo = dateToParam || todayStr();

  const stats = await getMemberStats(dateFrom, dateTo);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>회원통계</h1>

      <form method="get" style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <input type="date" name="dateFrom" defaultValue={dateFrom} />
        ~
        <input type="date" name="dateTo" defaultValue={dateTo} />
        <button type="submit">조회</button>
      </form>

      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#999" }}>기간 회원탈퇴</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{stats.totalWithdrawalCount}명</div>
        </div>
        <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#999" }}>기간 신규가입</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{stats.totalSignupCount}명</div>
        </div>
        <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#999" }}>기간 휴면전환</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{stats.totalSleepCount}명</div>
        </div>
        <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#999" }}>현재 휴면회원</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{stats.currentSleepMemberCount}명</div>
        </div>
      </div>

      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>날짜</th>
            <th>신규가입</th>
            <th>회원탈퇴</th>
            <th>휴면전환</th>
          </tr>
        </thead>
        <tbody>
          {stats.points.map((p) => (
            <tr key={p.date}>
              <td>{p.date}</td>
              <td>{p.signupCount}명</td>
              <td>{p.withdrawalCount}명</td>
              <td>{p.sleepCount}명</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
