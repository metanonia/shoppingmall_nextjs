import { prisma } from "@shoppingmall/db";
import { issueCoupon } from "./coupon";
import { type MileageValidityConfig, saveMileage, useMileage } from "./mileage";

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
