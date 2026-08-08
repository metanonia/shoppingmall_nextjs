import { getVisitorStats } from "@shoppingmall/core";

function date(daysAgo: number) { const value = new Date(); value.setDate(value.getDate() - daysAgo); return value.toISOString().slice(0, 10); }
function Breakdown({ title, rows, field }: { title: string; rows: Record<string, unknown>[]; field: string }) { return <div><h2>{title}</h2><ol>{rows.map((row) => <li key={String(row[field])}>{String(row[field])}: {String((row._count as { _all: number })._all)}</li>)}</ol></div>; }

export default async function VisitorStatsPage({ searchParams }: { searchParams: Promise<{ dateFrom?: string; dateTo?: string }> }) {
  const params = await searchParams; const dateFrom = params.dateFrom || date(30); const dateTo = params.dateTo || date(0); const stats = await getVisitorStats(dateFrom, dateTo);
  return <div><h1 style={{ fontSize: 20 }}>방문자·유입 통계</h1><form method="get" style={{ display: "flex", gap: 8, margin: "16px 0" }}><input type="date" name="dateFrom" defaultValue={dateFrom} /><input type="date" name="dateTo" defaultValue={dateTo} /><button>조회</button></form><table style={{ width: "100%" }}><thead><tr><th>날짜</th><th>방문자</th><th>페이지뷰</th><th>신규</th><th>재방문</th><th>PC</th><th>모바일</th></tr></thead><tbody>{stats.points.map((p) => <tr key={p.date}><td>{p.date}</td><td>{p.visitors}</td><td>{p.pageviews}</td><td>{p.newVisitors}</td><td>{p.returningVisitors}</td><td>{p.pc}</td><td>{p.mobile}</td></tr>)}</tbody></table><div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginTop: 24 }}><Breakdown title="브라우저" rows={stats.browsers} field="browser" /><Breakdown title="운영체제" rows={stats.operatingSystems} field="os" /><Breakdown title="유입사이트" rows={stats.sites} field="site" /><Breakdown title="유입검색어" rows={stats.keywords} field="keyword" /></div></div>;
}
