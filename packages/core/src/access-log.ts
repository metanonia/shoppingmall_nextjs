import { prisma } from "@shoppingmall/db";

function now(): number {
  return Math.floor(Date.now() / 1000);
}

export type AccessLogActorType = "ADMIN" | "VENDOR";

// Port of managers/main/login_ok.php / vendor/main/login_ok.php's admin_log/
// vendor_log inserts — merged into one table (mallRN_access_log) since the
// two legacy tables were column-for-column identical, see 015_completeness_
// logs.sql. Legacy's lib.Shop.php also suppresses a new row when it's an
// exact repeat of the immediately-preceding one; skipped here since login/
// logout events are already naturally spaced out and don't spam like the
// view-log types (2/3/5/6/7) legacy dedupes.
export async function recordAccessLog(actorType: AccessLogActorType, actorId: string, type: 0 | 1, content: string, accIp: string): Promise<void> {
  await prisma.accessLog.create({
    data: { actor_type: actorType, actor_id: actorId, content, type, acc_ip: accIp, signdate: now() },
  });
}

export type AccessLogListItem = {
  uid: number;
  actorType: AccessLogActorType;
  actorId: string;
  content: string;
  type: number;
  accIp: string;
  signdate: number;
};

export type AccessLogListResult = { items: AccessLogListItem[]; total: number; page: number; totalPages: number };

const ACCESS_LOG_PAGE_SIZE = 30;

export async function getAccessLogList(filters: { keyword?: string; actorType?: AccessLogActorType }, page = 1): Promise<AccessLogListResult> {
  const where = {
    ...(filters.actorType ? { actor_type: filters.actorType } : {}),
    ...(filters.keyword ? { OR: [{ actor_id: { contains: filters.keyword } }, { content: { contains: filters.keyword } }] } : {}),
  };

  const total = await prisma.accessLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / ACCESS_LOG_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const rows = await prisma.accessLog.findMany({
    where,
    orderBy: { uid: "desc" },
    skip: (safePage - 1) * ACCESS_LOG_PAGE_SIZE,
    take: ACCESS_LOG_PAGE_SIZE,
  });

  return {
    items: rows.map((r) => ({
      uid: r.uid,
      actorType: r.actor_type,
      actorId: r.actor_id,
      content: r.content,
      type: r.type,
      accIp: r.acc_ip,
      signdate: r.signdate,
    })),
    total,
    page: safePage,
    totalPages,
  };
}
