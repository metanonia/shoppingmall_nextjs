import { getMileageStats } from "@shoppingmall/core";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function MileageStatsPage({ searchParams }: { searchParams: Promise<{ dateFrom?: string; dateTo?: string }> }) {
  const { dateFrom: dateFromParam, dateTo: dateToParam } = await searchParams;
  const dateFrom = dateFromParam || daysAgoStr(30);
  const dateTo = dateToParam || todayStr();

  const stats = await getMileageStats(dateFrom, dateTo);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>마일리지통계</h1>

      <form method="get" style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <input type="date" name="dateFrom" defaultValue={dateFrom} />
        ~
        <input type="date" name="dateTo" defaultValue={dateTo} />
        <button type="submit">조회</button>
      </form>

      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#999" }}>기간 적립</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{stats.totalAccrued.toLocaleString("en-US")}</div>
        </div>
        <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#999" }}>기간 사용</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{stats.totalUsed.toLocaleString("en-US")}</div>
        </div>
        <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#999" }}>순증감</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{stats.net.toLocaleString("en-US")}</div>
        </div>
      </div>

      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>날짜</th>
            <th>적립</th>
            <th>사용</th>
          </tr>
        </thead>
        <tbody>
          {stats.points.map((p) => (
            <tr key={p.date}>
              <td>{p.date}</td>
              <td>{p.accrued.toLocaleString("en-US")}</td>
              <td>{p.used.toLocaleString("en-US")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
