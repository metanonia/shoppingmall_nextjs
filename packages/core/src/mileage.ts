import { type Prisma, prisma } from "@shoppingmall/db";
import type { ShopConfig } from "./config";

type DbClient = typeof prisma | Prisma.TransactionClient;

function now(): number {
  return Math.floor(Date.now() / 1000);
}

// Port of lib/lib.Shop.php:2685 mileageChange(). Recomputes the ledger sum
// and writes it back to Member.mileage's cached balance column — call this
// after any earn/spend so the two never drift apart.
export async function getMileageBalance(memberId: string, db: DbClient = prisma): Promise<number> {
  const agg = await db.mileage.aggregate({
    _sum: { mileage: true, use_mileage: true },
    where: { id: memberId, deleted: 0 },
  });
  const balance = (agg._sum.mileage ?? 0) - (agg._sum.use_mileage ?? 0);
  await db.member.updateMany({ where: { id: memberId }, data: { mileage: balance } });
  return balance;
}

// Port of lib/lib.Shop.php:2716 useMileageChange(). Spends against
// not-yet-expired, expiry-tracked lots oldest-expiry-first before recording
// the spend itself — mirrors legacy's FIFO consumption exactly.
export async function useMileage(
  memberId: string,
  amount: number,
  content: string,
  orderNum = "",
  procId = "", // admin actor id for a manual deduction (member-admin.ts); empty for purchase-time spends
  db: DbClient = prisma,
): Promise<void> {
  if (amount <= 0) return;

  const expiringLots = await db.mileage.findMany({
    where: { id: memberId, expired_use: 1, expired: 0, deleted: 0, mileage: { gt: 0 } },
    orderBy: { expired_date: "asc" },
  });

  let remaining = amount;
  for (const lot of expiringLots) {
    if (remaining <= 0) break;
    const available = lot.mileage - lot.proc_mileage;
    if (available <= 0) continue;
    const consume = Math.min(available, remaining);
    await db.mileage.update({ where: { uid: lot.uid }, data: { proc_mileage: lot.proc_mileage + consume } });
    remaining -= consume;
  }

  await db.mileage.create({
    data: { id: memberId, content, use_mileage: amount, order_num: orderNum, proc_id: procId, signdate: now() },
  });

  await getMileageBalance(memberId, db);
}

export type MileageValidityConfig = Pick<
  ShopConfig,
  "memberMileageValidityYn" | "memberMileageValidity" | "memberMileageValidityType"
>;

function computeExpiredDate(config: MileageValidityConfig): Date {
  if (config.memberMileageValidityYn !== "Y") return new Date("1000-01-01");
  const amount = Number(config.memberMileageValidity) || 0;
  const expires = new Date();
  if (config.memberMileageValidityType === "D") expires.setDate(expires.getDate() + amount);
  else if (config.memberMileageValidityType === "M") expires.setMonth(expires.getMonth() + amount);
  else expires.setFullYear(expires.getFullYear() + amount);
  return expires;
}

// Port of lib/lib.Shop.php:2759 saveMileageChange(). Used both for genuine
// earn (purchase-confirmation reward) and for crediting a refund back as
// mileage (order cancellation) — legacy uses the same function for both.
export async function saveMileage(
  memberId: string,
  amount: number,
  content: string,
  config: MileageValidityConfig,
  orderNum = "",
  goodsUid = "",
  procId = "", // admin actor id for a manual grant (member-admin.ts); empty for order-driven earns/refunds
  db: DbClient = prisma,
): Promise<void> {
  if (amount <= 0) return;

  const expiredUse = config.memberMileageValidityYn === "Y" ? 1 : 0;
  const expiredDate = computeExpiredDate(config);

  await db.mileage.create({
    data: {
      id: memberId,
      content,
      mileage: amount,
      expired_use: expiredUse,
      expired_date: expiredDate,
      order_num: orderNum,
      goods_uid: goodsUid,
      proc_id: procId,
      signdate: now(),
    },
  });

  await getMileageBalance(memberId, db);
}

export type MileageHistoryItem = {
  content: string;
  mileage: number;
  useMileage: number;
  orderNum: string;
  signdate: number;
};

export async function getMileageHistory(memberId: string): Promise<MileageHistoryItem[]> {
  const rows = await prisma.mileage.findMany({ where: { id: memberId }, orderBy: { uid: "desc" } });
  return rows.map((r) => ({
    content: r.content,
    mileage: r.mileage,
    useMileage: r.use_mileage,
    orderNum: r.order_num,
    signdate: r.signdate,
  }));
}
