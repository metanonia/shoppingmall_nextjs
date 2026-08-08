import { prisma } from "@shoppingmall/db";

// Port of lib/class.Mysql.php:576's automatic query-failure hook — legacy's
// custom mysqli wrapper logs every failed query globally. There's no
// equivalent single choke point in Prisma without wrapping the exported
// client in a $extends query interceptor, which would change the client's
// type for every one of this repo's ~30 call sites (including the
// `Prisma.TransactionClient` signatures core/*.ts functions accept) for a
// lowest-priority observability feature — not a safe trade. Instead this is
// a plain helper any call site can reach for in a catch block; wired into
// the two places most likely to fail silently otherwise (the cron routes —
// see apps/backoffice/app/api/cron/*/route.ts).
export async function logDbError(name: string, error: unknown): Promise<void> {
  try {
    await prisma.dbErrorLog.create({
      data: {
        name,
        message: error instanceof Error ? (error.stack ?? error.message) : String(error),
        signdate: Math.floor(Date.now() / 1000),
      },
    });
  } catch {
    // Logging the error must never itself throw — if the DB is unreachable,
    // there's nowhere left to record that fact.
  }
}

export type DbErrorLogItem = {
  uid: number;
  name: string;
  status: number;
  message: string;
  signdate: number;
};

export type DbErrorLogResult = { items: DbErrorLogItem[]; total: number; page: number; totalPages: number };

const DB_ERROR_LOG_PAGE_SIZE = 30;

export async function getDbErrorLogList(filters: { keyword?: string }, page = 1): Promise<DbErrorLogResult> {
  const where = filters.keyword ? { OR: [{ name: { contains: filters.keyword } }, { message: { contains: filters.keyword } }] } : {};

  const total = await prisma.dbErrorLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / DB_ERROR_LOG_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const rows = await prisma.dbErrorLog.findMany({
    where,
    orderBy: { uid: "desc" },
    skip: (safePage - 1) * DB_ERROR_LOG_PAGE_SIZE,
    take: DB_ERROR_LOG_PAGE_SIZE,
  });

  return {
    items: rows.map((r) => ({ uid: r.uid, name: r.name, status: r.status, message: r.message, signdate: r.signdate })),
    total,
    page: safePage,
    totalPages,
  };
}

export async function markDbErrorLogProcessed(uid: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const updated = await prisma.dbErrorLog.updateMany({ where: { uid }, data: { status: 1 } });
  if (updated.count === 0) return { ok: false, error: "존재하지 않는 로그입니다." };
  return { ok: true };
}
