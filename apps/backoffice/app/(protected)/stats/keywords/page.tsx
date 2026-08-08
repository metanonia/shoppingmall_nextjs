import { getKeywordStats } from "@shoppingmall/core";

function date(daysAgo: number) { const value = new Date(); value.setDate(value.getDate() - daysAgo); return value.toISOString().slice(0, 10); }

export default async function KeywordStatsPage({ searchParams }: { searchParams: Promise<{ dateFrom?: string; dateTo?: string }> }) {
  const params = await searchParams;
  const dateFrom = params.dateFrom || date(30);
  const dateTo = params.dateTo || date(0);
  const stats = await getKeywordStats(dateFrom, dateTo);
  return <div><h1 style={{ fontSize: 20 }}>검색어 통계</h1><form method="get" style={{ display: "flex", gap: 8, margin: "16px 0" }}><input type="date" name="dateFrom" defaultValue={dateFrom} /><input type="date" name="dateTo" defaultValue={dateTo} /><button>조회</button></form><p>검색 {stats.totalSearchCount}회 / 고유 검색어 {stats.uniqueKeywordCount}개</p><table style={{ width: "100%" }}><thead><tr><th>순위</th><th>검색어</th><th>검색수</th><th>비율</th></tr></thead><tbody>{stats.items.map((item, index) => <tr key={item.keyword}><td>{index + 1}</td><td>{item.keyword}</td><td>{item.count}</td><td>{item.pct}%</td></tr>)}</tbody></table></div>;
}
