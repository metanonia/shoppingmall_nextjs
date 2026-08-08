import { prisma } from "@shoppingmall/db";
import { issueCoupon } from "./coupon";
import { type MileageValidityConfig, getMileageBalance, saveMileage, useMileage } from "./mileage";

function now(): number {
  return Math.floor(Date.now() / 1000);
}

export type AdminMemberListItem = {
  id: string;
  name: string;
  email: string;
  cell: string;
  level: number;
  mileage: number;
  signdate: number;
};

export type AdminMemberListResult = { items: AdminMemberListItem[]; total: number; page: number; totalPages: number };

const ADMIN_MEMBERS_PAGE_SIZE = 20;

// Port of managers/member/member_list.php, keyword-only search across
// id/name/email/cell (this repo's established single-field simplification
// vs legacy's field/field2/field3/field4 multi-keyword search).
export async function getAdminMemberList(filters: { keyword?: string; level?: number }, page = 1): Promise<AdminMemberListResult> {
  const where = {
    ...(filters.keyword
      ? {
          OR: [
            { id: { contains: filters.keyword } },
            { name: { contains: filters.keyword } },
            { email: { contains: filters.keyword } },
            { cell: { contains: filters.keyword } },
          ],
        }
      : {}),
    ...(filters.level !== undefined ? { level: filters.level } : {}),
  };

  const total = await prisma.member.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_MEMBERS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const rows = await prisma.member.findMany({
    where,
    orderBy: { uid: "desc" },
    skip: (safePage - 1) * ADMIN_MEMBERS_PAGE_SIZE,
    take: ADMIN_MEMBERS_PAGE_SIZE,
  });

  return {
    items: rows.map((r) => ({ id: r.id, name: r.name, email: r.email, cell: r.cell, level: r.level, mileage: r.mileage, signdate: r.signdate })),
    total,
    page: safePage,
    totalPages,
  };
}

const MEMBER_EXPORT_ROW_CAP = 5000;

// Backs the admin member list's excel-download button — same
// filters/columns as getAdminMemberList, without pagination.
export async function getAdminMemberExportRows(filters: { keyword?: string; level?: number }): Promise<AdminMemberListItem[]> {
  const where = {
    ...(filters.keyword
      ? {
          OR: [
            { id: { contains: filters.keyword } },
            { name: { contains: filters.keyword } },
            { email: { contains: filters.keyword } },
            { cell: { contains: filters.keyword } },
          ],
        }
      : {}),
    ...(filters.level !== undefined ? { level: filters.level } : {}),
  };
  const rows = await prisma.member.findMany({ where, orderBy: { uid: "desc" }, take: MEMBER_EXPORT_ROW_CAP });
  return rows.map((r) => ({ id: r.id, name: r.name, email: r.email, cell: r.cell, level: r.level, mileage: r.mileage, signdate: r.signdate }));
}

export type MemberAdminResult = { ok: true } | { ok: false; error: string };

// Port of managers/member/member_post.php's `case "level"` — bulk level
// change with legacy's own guard: an actor can't grant a level higher than
// their own.
export async function changeMemberLevel(memberIds: string[], newLevel: number, actorLevel: number): Promise<MemberAdminResult> {
  if (memberIds.length === 0) return { ok: false, error: "회원을 선택해 주세요." };
  if (actorLevel < newLevel) return { ok: false, error: "본인 등급보다 높은 등급은 부여할 수 없습니다." };

  await prisma.member.updateMany({ where: { id: { in: memberIds } }, data: { level: newLevel } });
  return { ok: true };
}

export type IssueCouponToMembersResult = { ok: true; issuedCount: number; skippedCount: number } | { ok: false; error: string };

// Port of managers/member/member_post.php's `case "down_coupon"` — legacy
// has no separate "issue to one member" UI, bulk issuance to a checked
// selection IS the single-member case with one id checked. Reuses
// issueCoupon()'s existing per-member dedup guard (coupon.ts) rather than
// re-implementing it here.
export async function issueCouponToMembers(memberIds: string[], couponManagerUid: number): Promise<IssueCouponToMembersResult> {
  if (memberIds.length === 0) return { ok: false, error: "회원을 선택해 주세요." };

  let issuedCount = 0;
  let skippedCount = 0;
  for (const memberId of memberIds) {
    const result = await issueCoupon(memberId, couponManagerUid);
    if (result.ok) issuedCount++;
    else skippedCount++;
  }
  return { ok: true, issuedCount, skippedCount };
}

export type CouponManagerOption = { uid: number; name: string; discount: number; discountType: "P" | "W" };

export async function getCouponManagerOptions(): Promise<CouponManagerOption[]> {
  const rows = await prisma.couponManager.findMany({ orderBy: { uid: "desc" } });
  return rows.map((r) => ({ uid: r.uid, name: r.name, discount: r.discount, discountType: r.discount_type }));
}

export type CouponManagerListItem = {
  uid: number;
  name: string;
  discount: number;
  discountType: "P" | "W";
  discountLimit: number;
  useSDate: Date | null;
  useEDate: Date | null;
  useDay: number;
  useLimit: number;
  signdate: number;
};

// Port of managers/member/coupon_list.php — this repo skips `type`/
// `use_limit2`/`goods_order` (per-vendor issuance-trigger and product-scope
// targeting, an advanced feature with no consumer of it yet anywhere in
// this migration — coupon.ts's calcCouponDiscount applies a coupon
// shop-wide). `use_type` is kept: issueCoupon() (coupon.ts) already
// branches on it to decide fixed-date vs relative-days expiry.
export async function getCouponManagerList(): Promise<(CouponManagerListItem & { useType: number })[]> {
  const rows = await prisma.couponManager.findMany({ orderBy: { uid: "desc" } });
  return rows.map((r) => ({
    uid: r.uid,
    name: r.name,
    discount: r.discount,
    discountType: r.discount_type,
    discountLimit: r.discount_limit,
    useSDate: r.use_s_date,
    useEDate: r.use_e_date,
    useDay: r.use_day,
    useLimit: r.use_limit,
    useType: r.use_type,
    signdate: r.signdate,
  }));
}

export type CouponManagerInput = {
  name: string;
  discount: number;
  discountType: "P" | "W";
  discountLimit: number;
  useSDate: string; // yyyy-mm-dd, empty = no start bound
  useEDate: string; // used when useType===0 (fixed expiry date)
  useDay: number; // used when useType!==0 (days valid from issue date) — see issueCoupon
  useType: number;
  useLimit: number; // 0 = unlimited
};

export type CouponManagerResult = { ok: true } | { ok: false; error: string };

function toDateOrSentinel(dateStr: string): Date {
  return dateStr ? new Date(`${dateStr}T00:00:00`) : new Date("1000-01-01");
}

export async function createCouponManager(input: CouponManagerInput): Promise<CouponManagerResult> {
  if (!input.name) return { ok: false, error: "쿠폰명을 입력해 주세요." };
  await prisma.couponManager.create({
    data: {
      name: input.name,
      discount: input.discount,
      discount_type: input.discountType,
      discount_limit: input.discountLimit,
      use_s_date: toDateOrSentinel(input.useSDate),
      use_e_date: toDateOrSentinel(input.useEDate),
      use_day: input.useDay,
      use_type: input.useType,
      use_limit: input.useLimit,
      signdate: Math.floor(Date.now() / 1000),
    },
  });
  return { ok: true };
}

export async function updateCouponManager(uid: number, input: CouponManagerInput): Promise<CouponManagerResult> {
  if (!input.name) return { ok: false, error: "쿠폰명을 입력해 주세요." };
  const updated = await prisma.couponManager.updateMany({
    where: { uid },
    data: {
      name: input.name,
      discount: input.discount,
      discount_type: input.discountType,
      discount_limit: input.discountLimit,
      use_s_date: toDateOrSentinel(input.useSDate),
      use_e_date: toDateOrSentinel(input.useEDate),
      use_day: input.useDay,
      use_type: input.useType,
      use_limit: input.useLimit,
    },
  });
  if (updated.count === 0) return { ok: false, error: "존재하지 않는 쿠폰입니다." };
  return { ok: true };
}

export type AdjustMileageInput = { memberId: string; amount: number; reason: string; actorId: string };

// Port of managers/member/mileage_post.php's manual earn/deduct path —
// `amount > 0` earns (saveMileage), `amount < 0` deducts (useMileage) with
// the actor's id recorded in the ledger's proc_id (see mileage.ts's
// procId param, added for this).
export async function adjustMileage(input: AdjustMileageInput, config: MileageValidityConfig): Promise<MemberAdminResult> {
  if (input.amount === 0) return { ok: false, error: "조정할 금액을 입력해 주세요." };
  if (!input.reason.trim()) return { ok: false, error: "사유를 입력해 주세요." };

  const member = await prisma.member.findUnique({ where: { id: input.memberId } });
  if (!member) return { ok: false, error: "존재하지 않는 회원입니다." };

  if (input.amount > 0) {
    await saveMileage(input.memberId, input.amount, input.reason, config, "", "", input.actorId);
  } else {
    await useMileage(input.memberId, -input.amount, input.reason, "", input.actorId);
  }
  return { ok: true };
}

export type MileageLogListItem = {
  uid: number;
  memberId: string;
  content: string;
  mileage: number;
  useMileage: number;
  orderNum: string;
  procId: string;
  signdate: number;
  deleted: boolean;
};

export type MileageLogListResult = { items: MileageLogListItem[]; total: number; page: number; totalPages: number };

const MILEAGE_LOG_PAGE_SIZE = 30;

// Port of managers/member/mileage_list.php — the admin-wide ledger view,
// as opposed to mileage.ts's getMileageHistory (single member, used by
// mypage/my_mileage). Legacy's separate mileage_log_list.php (deleted-row
// recovery, backed by its own snapshot table mallRN_mileage_log) is folded
// into this same screen via soft-delete columns on Mileage itself —
// deleteMileageEntry/restoreMileageEntry below.
export async function getMileageLogList(filters: { keyword?: string }, page = 1): Promise<MileageLogListResult> {
  const where = filters.keyword ? { OR: [{ id: { contains: filters.keyword } }, { content: { contains: filters.keyword } }] } : {};

  const total = await prisma.mileage.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / MILEAGE_LOG_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const rows = await prisma.mileage.findMany({
    where,
    orderBy: { uid: "desc" },
    skip: (safePage - 1) * MILEAGE_LOG_PAGE_SIZE,
    take: MILEAGE_LOG_PAGE_SIZE,
  });

  return {
    items: rows.map((r) => ({
      uid: r.uid,
      memberId: r.id,
      content: r.content,
      mileage: r.mileage,
      useMileage: r.use_mileage,
      orderNum: r.order_num,
      procId: r.proc_id,
      signdate: r.signdate,
      deleted: r.deleted === 1,
    })),
    total,
    page: safePage,
    totalPages,
  };
}

// Port of managers/member/mileage_post.php's delete/repair cases —
// soft-delete instead of legacy's snapshot-to-mileage_log-then-drop, so
// "restore" is just clearing the flag rather than re-inserting a row.
export async function deleteMileageEntry(uid: number, actorId: string, actorIp: string): Promise<MemberAdminResult> {
  const row = await prisma.mileage.findFirst({ where: { uid } });
  if (!row) return { ok: false, error: "존재하지 않는 마일리지 내역입니다." };

  await prisma.mileage.update({
    where: { uid },
    data: { deleted: 1, deleted_proc_id: actorId, deleted_proc_ip: actorIp, deleted_date: Math.floor(Date.now() / 1000) },
  });
  await getMileageBalance(row.id);
  return { ok: true };
}

export async function restoreMileageEntry(uid: number): Promise<MemberAdminResult> {
  const row = await prisma.mileage.findFirst({ where: { uid } });
  if (!row) return { ok: false, error: "존재하지 않는 마일리지 내역입니다." };

  await prisma.mileage.update({ where: { uid }, data: { deleted: 0, deleted_proc_id: "", deleted_proc_ip: "", deleted_date: 0 } });
  await getMileageBalance(row.id);
  return { ok: true };
}

export type MemberSleepListItem = {
  uid: number;
  id: string;
  name: string;
  email: string;
  sleepTime: number;
  signdate: number;
};

export type MemberSleepListResult = { items: MemberSleepListItem[]; total: number; page: number; totalPages: number };

const MEMBER_SLEEP_PAGE_SIZE = 30;

// Port of managers/member/member_sleep_list.php's read side — Phase 9 built
// the cron conversion (scheduled-jobs.ts's processDormantMembers) but never
// an admin screen to see who got converted. Reactivation (legacy's
// nondormant_time + separate unlock flow) is still out of scope — see
// MIGRATION.md.
export async function getMemberSleepList(filters: { keyword?: string }, page = 1): Promise<MemberSleepListResult> {
  const where = filters.keyword
    ? { OR: [{ id: { contains: filters.keyword } }, { name: { contains: filters.keyword } }, { email: { contains: filters.keyword } }] }
    : {};

  const total = await prisma.memberSleep.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / MEMBER_SLEEP_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const rows = await prisma.memberSleep.findMany({
    where,
    orderBy: { uid: "desc" },
    skip: (safePage - 1) * MEMBER_SLEEP_PAGE_SIZE,
    take: MEMBER_SLEEP_PAGE_SIZE,
  });

  return {
    items: rows.map((r) => ({ uid: r.uid, id: r.id, name: r.name, email: r.email, sleepTime: r.sleep_time, signdate: r.signdate })),
    total,
    page: safePage,
    totalPages,
  };
}

export type MemberLevelListItem = {
  uid: number;
  level: number;
  name: string;
  discount: number;
  mileage: number;
  deliveryFree: boolean;
  price: number;
  couponUid: number;
  memberCount: number;
};

// Port of managers/config/member_level_info.php's list — this repo doesn't
// reserve level 90-99 for a separate "auto-tier" concept the way legacy did
// (no member level here reaches that high without an admin explicitly
// setting it), so every level defined here participates in both manual
// assignment (member-admin.ts's changeMemberLevel) and the auto-evaluation
// batch below.
// level 99+ is the admin range (see createMemberLevel's comment) — excluded
// here since this is a member-grade settings screen, not admin management.
export async function getMemberLevelList(): Promise<MemberLevelListItem[]> {
  const rows = await prisma.memberLevel.findMany({ where: { level: { lt: 99 } }, orderBy: { level: "asc" } });
  const counts = await prisma.member.groupBy({ by: ["level"], _count: { level: true } });
  const countByLevel = new Map(counts.map((c) => [c.level, c._count.level]));

  return rows.map((r) => ({
    uid: r.uid,
    level: r.level,
    name: r.name,
    discount: r.discount,
    mileage: r.mileage,
    deliveryFree: r.delivery_free === 1,
    price: r.price,
    couponUid: r.coupon_uid,
    memberCount: countByLevel.get(r.level) ?? 0,
  }));
}

export type MemberLevelInput = { name: string; discount: number; mileage: number; deliveryFree: boolean; price: number; couponUid: number };
export type MemberLevelResult = { ok: true } | { ok: false; error: string };

export async function createMemberLevel(input: MemberLevelInput): Promise<MemberLevelResult> {
  if (!input.name.trim()) return { ok: false, error: "등급명을 입력해 주세요." };
  // level 100 is the admin threshold (ADMIN_LEVEL_THRESHOLD in
  // apps/backoffice's login action) — new member-facing levels must stay
  // below it.
  const top = await prisma.memberLevel.findFirst({ where: { level: { lt: 99 } }, orderBy: { level: "desc" } });
  const level = (top?.level ?? 0) + 1;

  await prisma.memberLevel.create({
    data: {
      level,
      name: input.name,
      discount: input.discount,
      mileage: input.mileage,
      delivery_free: input.deliveryFree ? 1 : 0,
      price: input.price,
      coupon_uid: input.couponUid,
      signdate: now(),
    },
  });
  return { ok: true };
}

export async function updateMemberLevel(uid: number, input: MemberLevelInput): Promise<MemberLevelResult> {
  if (!input.name.trim()) return { ok: false, error: "등급명을 입력해 주세요." };
  const row = await prisma.memberLevel.findFirst({ where: { uid } });
  if (!row || row.level >= 99) return { ok: false, error: "존재하지 않는 등급입니다." };
  await prisma.memberLevel.update({
    where: { uid },
    data: {
      name: input.name,
      discount: input.discount,
      mileage: input.mileage,
      delivery_free: input.deliveryFree ? 1 : 0,
      price: input.price,
      coupon_uid: input.couponUid,
    },
  });
  return { ok: true };
}

// level 1 is this repo's base/default tier (changeMemberLevel and
// registerMember both default new/reassigned members there) — deleting it
// would leave those code paths pointing at nothing, so it's blocked the same
// way legacy blocks its two reserved base levels.
export async function deleteMemberLevel(uid: number): Promise<MemberLevelResult> {
  const row = await prisma.memberLevel.findFirst({ where: { uid } });
  if (!row || row.level >= 99) return { ok: false, error: "존재하지 않는 등급입니다." };
  if (row.level === 1) return { ok: false, error: "기본 등급은 삭제할 수 없습니다." };

  const memberCount = await prisma.member.count({ where: { level: row.level } });
  if (memberCount > 0) return { ok: false, error: `이 등급의 회원이 ${memberCount}명 있어 삭제할 수 없습니다.` };

  await prisma.memberLevel.delete({ where: { uid } });
  return { ok: true };
}

export type RecalculateMemberLevelsResult = { ok: true; evaluatedCount: number; changedCount: number; couponsIssued: number };

// Port of managers/member/member_level.php + member_level_post.php's
// cumulative-purchase auto-grading batch. Legacy sums mallRN_order_sales
// per member with a type/status/confirmation filter this repo's redesigned
// OrderSales (Phase 8) no longer carries — see admin-stats.ts's header
// comment for the same schema gap. This instead sums OrderInfo.pay_total
// per buyer id (same "real, non-cancelled order" predicate getSalesStats
// already uses), which is the more direct source for "how much has this
// member actually paid" anyway.
export async function recalculateMemberLevels(dateFrom: string, dateTo: string): Promise<RecalculateMemberLevelsResult> {
  const fromUnix = Math.floor(new Date(`${dateFrom}T00:00:00`).getTime() / 1000);
  const toUnix = Math.floor(new Date(`${dateTo}T23:59:59`).getTime() / 1000);

  const [orders, levels, members] = await Promise.all([
    prisma.orderInfo.findMany({ where: { reals: 1, signdate: { gte: fromUnix, lte: toUnix } }, select: { id: true, pay_total: true } }),
    prisma.memberLevel.findMany({ where: { level: { gt: 0 } }, orderBy: { price: "desc" } }),
    prisma.member.findMany({ where: { level: { lt: 99 } }, select: { id: true, level: true } }),
  ]);
  if (levels.length === 0) return { ok: true, evaluatedCount: 0, changedCount: 0, couponsIssued: 0 };

  const baseLevel = levels.reduce((min, l) => (l.level < min.level ? l : min), levels[0]);
  const spendById = new Map<string, number>();
  for (const order of orders) {
    if (!order.id) continue;
    spendById.set(order.id, (spendById.get(order.id) ?? 0) + order.pay_total);
  }

  let changedCount = 0;
  let couponsIssued = 0;
  for (const member of members) {
    const spend = spendById.get(member.id) ?? 0;
    const matched = levels.find((l) => l.price <= spend) ?? baseLevel;
    if (matched.level === member.level) continue;

    await prisma.member.update({ where: { id: member.id }, data: { level: matched.level } });
    changedCount++;
    if (matched.coupon_uid) {
      const result = await issueCoupon(member.id, matched.coupon_uid);
      if (result.ok) couponsIssued++;
    }
  }

  await prisma.configuration.update({
    where: { uid: 2 },
    data: { member_level_time: now(), member_level_date: `${dateFrom} ~ ${dateTo}` },
  });

  return { ok: true, evaluatedCount: members.length, changedCount, couponsIssued };
}
