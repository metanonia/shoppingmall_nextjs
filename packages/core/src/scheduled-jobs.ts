import { prisma } from "@shoppingmall/db";
import { getMileageBalance } from "./mileage";
import { renderDormantWarningEmail, sendMail } from "./mailer";

function now(): number {
  return Math.floor(Date.now() / 1000);
}

// Port of async_day_proc.php's coupon-expiry pass — coupons past e_date that
// were never used just flip 0 (available) -> 2 (expired). Used coupons
// (status=1) are never touched.
export async function expireCoupons(): Promise<{ count: number }> {
  const result = await prisma.coupon.updateMany({
    where: { status: 0, e_date: { lt: new Date() } },
    data: { status: 2 },
  });
  return { count: result.count };
}

// Port of async_day_proc.php's mileage-expiry pass. Mirrors useMileage()'s
// own FIFO-lot bookkeeping: a lot's unconsumed remainder (mileage -
// proc_mileage) is reversed with a ledger row (not a mutation of the lot
// itself, same "ledger, never edit history" principle useMileage follows),
// then the lot is marked expired so it's never picked up again.
export async function expireMileageLots(): Promise<{ memberCount: number; totalExpired: number }> {
  const dueLots = await prisma.mileage.findMany({
    where: { expired_use: 1, expired: 0, deleted: 0, expired_date: { lt: new Date() } },
  });

  const memberIds = new Set<string>();
  let totalExpired = 0;

  for (const lot of dueLots) {
    const remaining = lot.mileage - lot.proc_mileage;
    await prisma.$transaction(async (tx) => {
      if (remaining > 0) {
        await tx.mileage.create({
          data: { id: lot.id, content: "마일리지 유효기간 만료", use_mileage: remaining, signdate: now() },
        });
        totalExpired += remaining;
      }
      await tx.mileage.update({ where: { uid: lot.uid }, data: { expired: 1 } });
      await getMileageBalance(lot.id, tx);
    });
    memberIds.add(lot.id);
  }

  return { memberCount: memberIds.size, totalExpired };
}

// "Never actually scheduled yet" sentinel this schema uses throughout
// (Banner/Exhibition/etc. all default s_date/e_date to '1000-01-01') — must
// be excluded here, otherwise a draft exhibition an admin set to status=1
// without picking real dates yet would get force-started on the very next
// batch run.
const UNSCHEDULED_SENTINEL = new Date("2000-01-01");

// Port of async_day_proc.php's exhibition status-transition pass — admin
// only ever sets status at create/update time (exhibition-admin.ts), so
// without this batch an exhibition would stay "준비중" forever even after
// its start date arrives. status: 1=준비중, 2=진행중, 3=종료.
export async function updateExhibitionStatuses(): Promise<{ startedCount: number; endedCount: number }> {
  const nowDate = new Date();
  const started = await prisma.exhibition.updateMany({
    where: { status: 1, s_date: { gt: UNSCHEDULED_SENTINEL, lte: nowDate } },
    data: { status: 2 },
  });
  const ended = await prisma.exhibition.updateMany({
    where: { status: 2, e_date: { gt: UNSCHEDULED_SENTINEL, lt: nowDate } },
    data: { status: 3 },
  });
  return { startedCount: started.count, endedCount: ended.count };
}

// Retention windows, in days — only the 3 tables that actually exist in
// this repo (most of legacy's log-purge list is visitor-tracking
// infrastructure this migration never built, see MIGRATION.md Phase 7).
const KEYWORD_RECENT_RETENTION_DAYS = 90;
const KEYWORD_SEARCH_RETENTION_DAYS = 730;
const SMS_LOG_RETENTION_DAYS = 180;

function daysAgoUnix(days: number): number {
  return now() - days * 86400;
}

export async function purgeOldLogs(): Promise<{ keywordRecent: number; keywordSearch: number; smsLog: number }> {
  const keywordRecent = await prisma.keywordRecent.deleteMany({
    where: { signdate: { lt: daysAgoUnix(KEYWORD_RECENT_RETENTION_DAYS) } },
  });
  const keywordSearch = await prisma.keywordSearch.deleteMany({
    where: { date: { lt: new Date(daysAgoUnix(KEYWORD_SEARCH_RETENTION_DAYS) * 1000) } },
  });
  const smsLog = await prisma.smsLog.deleteMany({
    where: { signdate: { lt: daysAgoUnix(SMS_LOG_RETENTION_DAYS) } },
  });
  return { keywordRecent: keywordRecent.count, keywordSearch: keywordSearch.count, smsLog: smsLog.count };
}

// Port of async_day_proc.php's dormant-member pass. "Last activity" falls
// back to signdate when login_time is still 0 (never logged in since
// registering) — without this a brand-new member would look 55+ years
// inactive (unix epoch) and get force-converted on the very next run.
// Reactivation (legacy's nondormant_time + a dedicated unlock screen) is a
// separate feature this migration doesn't build — see MIGRATION.md.
const DORMANT_SLEEP_DAYS = 365;
const DORMANT_WARNING_DAYS = 335; // 30 days before conversion

function lastActivityWhere(maxAgeDays: number, minAgeDays?: number) {
  const maxAge = daysAgoUnix(maxAgeDays); // older than this = inactive long enough
  const minAge = minAgeDays !== undefined ? daysAgoUnix(minAgeDays) : undefined;
  const bound = minAge !== undefined ? { lte: maxAge, gt: minAge } : { lte: maxAge };
  return {
    OR: [
      { login_time: { gt: 0, ...bound } },
      { login_time: 0, signdate: bound },
    ],
  };
}

export type DormantMemberResult = { warnedCount: number; convertedCount: number };

export async function processDormantMembers(shopName: string): Promise<DormantMemberResult> {
  // 335-364 days inactive: one-time warning email, member untouched.
  const warningCandidates = await prisma.member.findMany({
    where: lastActivityWhere(DORMANT_WARNING_DAYS, DORMANT_SLEEP_DAYS),
  });
  for (const member of warningCandidates) {
    if (!member.email) continue;
    const rendered = await renderDormantWarningEmail({ shopName, memberName: member.name, daysUntilSleep: DORMANT_SLEEP_DAYS - DORMANT_WARNING_DAYS });
    await sendMail({ to: member.email, subject: rendered.subject, html: rendered.html });
  }

  // 365+ days inactive: archive into MemberSleep, then hard-delete — same
  // order legacy uses (snapshot first, delete second).
  const sleepCandidates = await prisma.member.findMany({ where: lastActivityWhere(DORMANT_SLEEP_DAYS) });
  for (const member of sleepCandidates) {
    await prisma.$transaction(async (tx) => {
      const { uid: _uid, ...rest } = member;
      await tx.memberSleep.create({ data: { ...rest, sleep_time: now() } });
      await tx.member.delete({ where: { uid: member.uid } });
    });
  }

  return { warnedCount: warningCandidates.length, convertedCount: sleepCandidates.length };
}

export type DailyBatchResult = {
  couponsExpired: number;
  mileageMembersExpired: number;
  mileageTotalExpired: number;
  exhibitionsStarted: number;
  exhibitionsEnded: number;
  dormantWarned: number;
  dormantConverted: number;
  logsPurged: { keywordRecent: number; keywordSearch: number; smsLog: number };
};

// Orchestrates the whole daily batch — the Node equivalent of legacy's
// self-pinged async_day_proc.php, invoked by apps/backoffice's
// /api/cron/daily route instead of an HTTP self-ping.
export async function runDailyBatch(shopName = "SHOP NEXT"): Promise<DailyBatchResult> {
  const coupons = await expireCoupons();
  const mileage = await expireMileageLots();
  const exhibitions = await updateExhibitionStatuses();
  const dormant = await processDormantMembers(shopName);
  const logsPurged = await purgeOldLogs();

  return {
    couponsExpired: coupons.count,
    mileageMembersExpired: mileage.memberCount,
    mileageTotalExpired: mileage.totalExpired,
    exhibitionsStarted: exhibitions.startedCount,
    exhibitionsEnded: exhibitions.endedCount,
    dormantWarned: dormant.warnedCount,
    dormantConverted: dormant.convertedCount,
    logsPurged,
  };
}
