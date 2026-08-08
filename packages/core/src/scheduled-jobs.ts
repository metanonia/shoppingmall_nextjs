import { prisma } from "@shoppingmall/db";
import { getMileageBalance } from "./mileage";
import { renderDormantWarningEmail, sendMail } from "./mailer";
import { issueCoupon } from "./coupon";
import { orderStatus4, orderStatus5, orderStatus9 } from "./order";

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

function monthDay(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function lunarMonthDay(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-u-ca-chinese", { month: "numeric", day: "numeric", timeZone: "Asia/Seoul" }).formatToParts(date);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 0);
  const day = Number(parts.find((part) => part.type === "day")?.value ?? 0);
  return `${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
}

// Port of async_day_proc.php's annual type=3 birthday coupon issuance.
export async function issueBirthdayCoupons(date = new Date()): Promise<{ count: number }> {
  const templates = await prisma.couponManager.findMany({ where: { type: 3 } });
  if (!templates.length) return { count: 0 };
  const [solar, lunar] = [monthDay(date), lunarMonthDay(date)];
  const members = await prisma.member.findMany({ where: { OR: [
    { birth_sl: "S", birth: { endsWith: solar } },
    { birth_sl: "L", birth: { endsWith: lunar } },
  ] }, select: { id: true } });
  const yearStart = Math.floor(new Date(date.getFullYear(), 0, 1).getTime() / 1000);
  let count = 0;
  for (const member of members) for (const template of templates) {
    const issued = await prisma.coupon.count({ where: { id: member.id, c_uid: template.uid, signdate: { gte: yearStart } } });
    if (!issued && (await issueCoupon(member.id, template.uid)).ok) count++;
  }
  return { count };
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

export async function processAutomaticOrderStatuses(): Promise<{ delivered: number; confirmed: number; cancelled: number; draftsDeleted: number }> {
  const config = await prisma.configuration.findUniqueOrThrow({ where: { uid: 1 } });
  let delivered = 0;
  let confirmed = 0;
  let cancelled = 0;

  if (config.order_tracker_yn === "N" && config.order_auto_completed1 > 0) {
    const due = await prisma.orderGoods.findMany({ where: { reals: 1, status_date: { lt: daysAgoUnix(config.order_auto_completed1) }, OR: [{ status: 3 }, { status: 7, status2: 4 }] }, select: { uid: true, order_num: true } });
    for (const line of due) if ((await orderStatus4(line.order_num, line.uid, "auto")).ok) delivered++;
  }
  if (config.order_auto_completed2 > 0) {
    const due = await prisma.orderGoods.findMany({ where: { reals: 1, status: 4, status_date: { lt: daysAgoUnix(config.order_auto_completed2) } }, select: { uid: true, order_num: true } });
    for (const line of due) if ((await orderStatus5(line.order_num, line.uid, "auto")).ok) confirmed++;
  }
  if (config.order_auto_completed3 > 0) {
    // The legacy SQL says pay_status='C' but then calls orderStatus9(), whose
    // contract is unpaid cancellation. Use the internally consistent unpaid
    // condition so stale bank/unfinished orders are actually cancellable.
    const due = await prisma.orderInfo.findMany({ where: { pay_status: { not: "C" }, signdate: { lt: daysAgoUnix(config.order_auto_completed3) } }, select: { order_num: true } });
    for (const order of due) {
      const active = await prisma.orderGoods.count({ where: { order_num: order.order_num, reals: 1, status: { gt: 0, lt: 9 } } });
      if (active === 0 && (await orderStatus9(order.order_num, "auto")).ok) cancelled++;
    }
  }
  const draftCutoff = daysAgoUnix(3);
  const [draftGoods, draftOrders] = await prisma.$transaction([
    prisma.orderGoods.deleteMany({ where: { reals: 0, signdate: { lt: draftCutoff } } }),
    prisma.orderInfo.deleteMany({ where: { reals: 0, signdate: { lt: draftCutoff } } }),
  ]);
  return { delivered, confirmed, cancelled, draftsDeleted: draftGoods.count + draftOrders.count };
}

export type DailyBatchResult = {
  birthdayCouponsIssued: number;
  couponsExpired: number;
  mileageMembersExpired: number;
  mileageTotalExpired: number;
  exhibitionsStarted: number;
  exhibitionsEnded: number;
  dormantWarned: number;
  dormantConverted: number;
  logsPurged: { keywordRecent: number; keywordSearch: number; smsLog: number };
  automaticOrders: { delivered: number; confirmed: number; cancelled: number; draftsDeleted: number };
};

// Orchestrates the whole daily batch — the Node equivalent of legacy's
// self-pinged async_day_proc.php, invoked by apps/backoffice's
// /api/cron/daily route instead of an HTTP self-ping.
export async function runDailyBatch(shopName = "SHOP NEXT"): Promise<DailyBatchResult> {
  const coupons = await expireCoupons();
  const birthdayCoupons = await issueBirthdayCoupons();
  const mileage = await expireMileageLots();
  const exhibitions = await updateExhibitionStatuses();
  const dormant = await processDormantMembers(shopName);
  const logsPurged = await purgeOldLogs();
  const automaticOrders = await processAutomaticOrderStatuses();

  return {
    couponsExpired: coupons.count,
    birthdayCouponsIssued: birthdayCoupons.count,
    mileageMembersExpired: mileage.memberCount,
    mileageTotalExpired: mileage.totalExpired,
    exhibitionsStarted: exhibitions.startedCount,
    exhibitionsEnded: exhibitions.endedCount,
    dormantWarned: dormant.warnedCount,
    dormantConverted: dormant.convertedCount,
    logsPurged,
    automaticOrders,
  };
}
