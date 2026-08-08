import { getMarginStats } from "@shoppingmall/core";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function MarginStatsPage({ searchParams }: { searchParams: Promise<{ dateFrom?: string; dateTo?: string }> }) {
  const { dateFrom: dateFromParam, dateTo: dateToParam } = await searchParams;
  const dateFrom = dateFromParam || daysAgoStr(30);
  const dateTo = dateToParam || todayStr();

  const stats = await getMarginStats(dateFrom, dateTo);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>마진통계</h1>

      <form method="get" style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
        <input type="date" name="dateFrom" defaultValue={dateFrom} />
        ~
        <input type="date" name="dateTo" defaultValue={dateTo} />
        <button type="submit">조회</button>
      </form>

      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#999" }}>기간 매출액</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{formatWon(stats.salesTotal)}원</div>
        </div>
        <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#999" }}>기간 마진액</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{formatWon(stats.marginTotal)}원</div>
        </div>
        <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: "#999" }}>마진율</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{stats.marginPct}%</div>
        </div>
      </div>

      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>날짜</th>
            <th>매출액</th>
            <th>마진액</th>
          </tr>
        </thead>
        <tbody>
          {stats.points.map((p) => (
            <tr key={p.date}>
              <td>{p.date}</td>
              <td>{formatWon(p.salesTotal)}원</td>
              <td>{formatWon(p.marginTotal)}원</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
