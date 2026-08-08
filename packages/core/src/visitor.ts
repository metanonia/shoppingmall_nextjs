import { prisma } from "@shoppingmall/db";

function dayStart(timestamp = Date.now()): number { const d = new Date(timestamp); d.setHours(0, 0, 0, 0); return Math.floor(d.getTime() / 1000); }
function dateToUnix(value: string, end = false): number { return Math.floor(new Date(`${value}T${end ? "23:59:59" : "00:00:00"}`).getTime() / 1000); }

export type VisitorEventInput = { visitorKey: string; path: string; referer: string; userAgent: string };

function parseAgent(userAgent: string) {
  const browser = /Edg\//i.test(userAgent) ? "Edge" : /Chrome\//i.test(userAgent) ? "Chrome" : /Safari\//i.test(userAgent) ? "Safari" : /Firefox\//i.test(userAgent) ? "Firefox" : "기타";
  const os = /Android/i.test(userAgent) ? "Android" : /iPhone|iPad/i.test(userAgent) ? "iOS" : /Windows/i.test(userAgent) ? "Windows" : /Mac OS/i.test(userAgent) ? "macOS" : /Linux/i.test(userAgent) ? "Linux" : "기타";
  return { browser, os, mobile: /Mobile|Android|iPhone|iPad/i.test(userAgent) ? 1 : 0 };
}

function parseReferer(referer: string): { site: string; keyword: string } {
  try {
    const url = new URL(referer);
    const site = url.hostname.replace(/^www\./, "");
    const keyword = url.searchParams.get("query") || url.searchParams.get("q") || url.searchParams.get("keyword") || "";
    return { site, keyword: keyword.slice(0, 150) };
  } catch { return { site: "", keyword: "" }; }
}

export async function logVisitorEvent(input: VisitorEventInput): Promise<void> {
  if (!input.visitorKey || input.path.startsWith("/api/") || input.path.startsWith("/_next/")) return;
  const agent = parseAgent(input.userAgent);
  const source = parseReferer(input.referer);
  let vendor = "";
  try { const url = new URL(input.path, "http://local"); vendor = url.pathname === "/store" ? url.searchParams.get("vendor") ?? "" : ""; } catch {}
  await prisma.visitorEvent.create({ data: { visitor_key: input.visitorKey, path: input.path.slice(0, 500), referer: input.referer.slice(0, 500), ...source, ...agent, vendor, date: dayStart(), signdate: Math.floor(Date.now() / 1000) } });
}

export type VisitorStatsPoint = { date: string; visitors: number; pageviews: number; newVisitors: number; returningVisitors: number; pc: number; mobile: number };
export async function getVisitorStats(dateFrom: string, dateTo: string, vendor = "") {
  const from = dateToUnix(dateFrom); const to = dateToUnix(dateTo, true);
  const rows = await prisma.visitorEvent.findMany({ where: { date: { gte: from, lte: to }, ...(vendor ? { vendor } : {}) }, orderBy: { signdate: "asc" } });
  const prior = await prisma.visitorEvent.findMany({ where: { date: { lt: from }, visitor_key: { in: Array.from(new Set(rows.map((r) => r.visitor_key))) } }, select: { visitor_key: true }, distinct: ["visitor_key"] });
  const seenBefore = new Set(prior.map((r) => r.visitor_key));
  const grouped = new Map<number, typeof rows>();
  for (const row of rows) { const group = grouped.get(row.date) ?? []; group.push(row); grouped.set(row.date, group); }
  const points: VisitorStatsPoint[] = [];
  for (const [date, events] of grouped) {
    const visitors = Array.from(new Set(events.map((e) => e.visitor_key)));
    const newVisitors = visitors.filter((key) => !seenBefore.has(key)).length;
    points.push({ date: new Date(date * 1000).toISOString().slice(0, 10), visitors: visitors.length, pageviews: events.length, newVisitors, returningVisitors: visitors.length - newVisitors, pc: events.filter((e) => e.mobile === 0).length, mobile: events.filter((e) => e.mobile === 1).length });
    visitors.forEach((key) => seenBefore.add(key));
  }
  const breakdown = async (field: "browser" | "os" | "site" | "keyword") => prisma.visitorEvent.groupBy({ by: [field], where: { date: { gte: from, lte: to }, ...(vendor ? { vendor } : {}), [field]: { not: "" } }, _count: { _all: true }, orderBy: { _count: { [field]: "desc" } }, take: 30 });
  const [browsers, operatingSystems, sites, keywords] = await Promise.all([breakdown("browser"), breakdown("os"), breakdown("site"), breakdown("keyword")]);
  return { points, browsers, operatingSystems, sites, keywords };
}
