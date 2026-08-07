import { prisma } from "@shoppingmall/db";

const RECENT_LIMIT = 10;
const POPULAR_LIMIT = 10;
const AUTOCOMPLETE_LIMIT = 10;
const WINDOW_DAYS = 3; // matches php/top.php's 3-day window for recent + popular keywords

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export type SearchViewer = { memberId?: string; ip: string };

// Port of php/search.php:248-267's mallRN_keyword_search upsert-by-day
// (drives the "추천 검색어" popularity ranking).
export async function logSearchKeyword(keyword: string): Promise<void> {
  const trimmed = keyword.trim();
  if (!trimmed) return;

  const existing = await prisma.keywordSearch.findFirst({ where: { keyword: trimmed, date: startOfToday() } });
  if (existing) {
    await prisma.keywordSearch.update({ where: { uid: existing.uid }, data: { count: { increment: 1 } } });
  } else {
    await prisma.keywordSearch.create({ data: { keyword: trimmed, count: 1, date: startOfToday() } });
  }
}

// Port of php/top.php:20-27's mallRN_keyword_recent write, scoped by member
// id when logged in or by IP for guests (same as legacy).
export async function logRecentKeyword(keyword: string, viewer: SearchViewer): Promise<void> {
  const trimmed = keyword.trim();
  if (!trimmed) return;
  await prisma.keywordRecent.create({
    data: {
      keyword: trimmed,
      id: viewer.memberId ?? "",
      ip: viewer.ip,
      signdate: Math.floor(Date.now() / 1000),
    },
  });
}

// Port of php/top.php:32-40's recent-keyword read, deduped so the dropdown
// doesn't just repeat the same term.
export async function getRecentKeywords(viewer: SearchViewer): Promise<string[]> {
  const scope = viewer.memberId ? { id: viewer.memberId } : { id: "", ip: viewer.ip };
  const rows = await prisma.keywordRecent.findMany({
    where: { ...scope, signdate: { gt: Math.floor(daysAgo(WINDOW_DAYS).getTime() / 1000) } },
    orderBy: { uid: "desc" },
    take: RECENT_LIMIT * 3, // over-fetch, then dedupe down to RECENT_LIMIT
  });

  const seen = new Set<string>();
  const result: string[] = [];
  for (const row of rows) {
    if (seen.has(row.keyword)) continue;
    seen.add(row.keyword);
    result.push(row.keyword);
    if (result.length >= RECENT_LIMIT) break;
  }
  return result;
}

export async function deleteAllRecentKeywords(viewer: SearchViewer): Promise<void> {
  const scope = viewer.memberId ? { id: viewer.memberId } : { id: "", ip: viewer.ip };
  await prisma.keywordRecent.deleteMany({ where: scope });
}

// Port of php/top.php:47's "인기/추천 검색어" ranking (SUM(count) over the
// last 3 days, highest first).
export async function getPopularKeywords(): Promise<string[]> {
  const rows = await prisma.keywordSearch.groupBy({
    by: ["keyword"],
    where: { date: { gt: daysAgo(WINDOW_DAYS) } },
    _sum: { count: true },
    orderBy: { _sum: { count: "desc" } },
    take: POPULAR_LIMIT,
  });
  return rows.map((r) => r.keyword).filter(Boolean);
}

// Simplified autocomplete: legacy's mallRN_keyword_autocomplete is populated
// by a jamo-decomposition pipeline (auto-derived from best-selling goods
// names, plus manual admin entry — see MIGRATION.md) that's out of scope for
// now. This suggests directly from the search-log table instead — no admin
// UI needed to make it useful, and it's real search history rather than
// curated entries.
export async function getAutocompleteSuggestions(prefix: string): Promise<string[]> {
  const trimmed = prefix.trim();
  if (!trimmed) return [];

  const rows = await prisma.keywordSearch.groupBy({
    by: ["keyword"],
    where: { keyword: { contains: trimmed } },
    _sum: { count: true },
    orderBy: { _sum: { count: "desc" } },
    take: AUTOCOMPLETE_LIMIT,
  });
  return rows.map((r) => r.keyword).filter(Boolean);
}
