import { prisma } from "@shoppingmall/db";
import { verifyPassword } from "@shoppingmall/auth";
import { notifyOrderShipped } from "./notification";

const now = () => Math.floor(Date.now() / 1000);

export type OrderChangeType = 7 | 8 | 9;
export type OrderChangeProcessStatus = 2 | 3 | 4 | 5 | 9;
export type OrderChangeResult = { ok: true } | { ok: false; error: string };

export async function requestOrderChange(input: {
  orderNum: string;
  ogUid: number;
  memberId: string;
  type: OrderChangeType;
  reason: string;
  message?: string;
  bankInfo?: string;
}): Promise<OrderChangeResult> {
  if (!input.reason.trim()) return { ok: false, error: "사유를 입력해주세요." };

  return prisma.$transaction(async (tx) => {
    const order = await tx.orderInfo.findFirst({ where: { order_num: input.orderNum, id: input.memberId, reals: 1 } });
    if (!order) return { ok: false, error: "주문 정보를 확인할 수 없습니다." };
    const line = await tx.orderGoods.findFirst({ where: { uid: input.ogUid, order_num: input.orderNum, reals: 1 } });
    if (!line) return { ok: false, error: "주문상품을 확인할 수 없습니다." };
    const eligible = input.type === 9 ? line.status === 1 || line.status === 2 : line.status >= 3 && line.status <= 5;
    if (!eligible) return { ok: false, error: "현재 주문상태에서는 요청할 수 없습니다." };
    const exists = await tx.orderStatusChange.count({ where: { order_num: input.orderNum, og_uid: input.ogUid, status2: { in: [1, 2, 3, 4] } } });
    if (exists > 0) return { ok: false, error: "이미 처리 중인 요청이 있습니다." };

    const timestamp = now();
    await tx.orderStatusChange.create({
      data: {
        id: input.memberId,
        name: order.name,
        vendor: line.vendor,
        order_num: input.orderNum,
        og_uid: input.ogUid,
        reason: input.reason.trim(),
        message: input.message?.trim() || null,
        bank_info: input.type === 7 ? "" : input.bankInfo?.trim() ?? "",
        status: input.type,
        status2: 1,
        signdate: timestamp,
      },
    });
    await tx.orderGoods.update({ where: { uid: line.uid }, data: { status: input.type, status2: 1, status_date: timestamp } });
    await tx.orderLog.create({ data: { order_num: input.orderNum, og_uid: line.uid, id: input.memberId, prev_status: line.status, prev_status2: line.status2, status: input.type, status2: 1, signdate: timestamp } });
    return { ok: true };
  });
}

export async function requestGuestOrderChange(input: Omit<Parameters<typeof requestOrderChange>[0], "memberId"> & { guestName: string; guestPasswordPlain: string }): Promise<OrderChangeResult> {
  const order = await prisma.orderInfo.findFirst({ where: { order_num: input.orderNum, id: "", reals: 1 } });
  if (!order || order.name.trim().toLowerCase() !== input.guestName.trim().toLowerCase() || !(await verifyPassword(order.passwd, input.guestPasswordPlain))) {
    return { ok: false, error: "주문 정보가 일치하지 않습니다." };
  }
  return requestOrderChange({ ...input, memberId: "" });
}

export async function cancelOrderChangeRequest(uid: number, memberId: string): Promise<OrderChangeResult> {
  return prisma.$transaction(async (tx) => {
    const request = await tx.orderStatusChange.findFirst({ where: { uid, id: memberId, status2: 1 } });
    if (!request) return { ok: false, error: "철회할 수 있는 요청이 없습니다." };
    const line = await tx.orderGoods.findFirst({ where: { uid: request.og_uid, order_num: request.order_num } });
    if (!line) return { ok: false, error: "주문상품을 확인할 수 없습니다." };
    const prior = await tx.orderLog.findFirst({ where: { order_num: request.order_num, og_uid: request.og_uid, status2: 0 }, orderBy: { uid: "desc" } });
    const previousStatus = prior?.status ?? (line.delivery_info ? 3 : 2);
    const timestamp = now();
    await tx.orderStatusChange.delete({ where: { uid } });
    await tx.orderGoods.update({ where: { uid: line.uid }, data: { status: previousStatus, status2: 0, status_date: timestamp } });
    await tx.orderLog.create({ data: { order_num: request.order_num, og_uid: request.og_uid, id: memberId, prev_status: request.status, prev_status2: request.status2, status: previousStatus, status2: 0, signdate: timestamp } });
    return { ok: true };
  });
}

export async function cancelGuestOrderChangeRequest(input: { uid: number; orderNum: string; guestName: string; guestPasswordPlain: string }): Promise<OrderChangeResult> {
  const order = await prisma.orderInfo.findFirst({ where: { order_num: input.orderNum, id: "", reals: 1 } });
  if (!order || order.name.trim().toLowerCase() !== input.guestName.trim().toLowerCase() || !(await verifyPassword(order.passwd, input.guestPasswordPlain))) {
    return { ok: false, error: "주문 정보가 일치하지 않습니다." };
  }
  return cancelOrderChangeRequest(input.uid, "");
}

export async function getOrderChanges(filters: { vendorId?: string; orderNum?: string; activeOnly?: boolean } = {}) {
  return prisma.orderStatusChange.findMany({
    where: {
      ...(filters.vendorId ? { vendor: filters.vendorId } : {}),
      ...(filters.orderNum ? { order_num: filters.orderNum } : {}),
      ...(filters.activeOnly ? { status2: { in: [1, 2, 3, 4] } } : {}),
    },
    orderBy: { uid: "desc" },
  });
}

export async function processOrderChange(input: {
  uid: number;
  actorId: string;
  status2: OrderChangeProcessStatus;
  vendorId?: string;
  carrier?: string;
  trackingNumber?: string;
}): Promise<OrderChangeResult> {
  const result: OrderChangeResult = await prisma.$transaction(async (tx): Promise<OrderChangeResult> => {
    const request = await tx.orderStatusChange.findFirst({ where: { uid: input.uid, ...(input.vendorId ? { vendor: input.vendorId } : {}) } });
    if (!request) return { ok: false, error: "요청을 확인할 수 없습니다." };
    const allowed = request.status === 7
      ? [2, 3, 4, 9]
      : request.status === 8
        ? [2, 3, 5, 9]
        : [5, 9];
    if (!allowed.includes(input.status2)) return { ok: false, error: "허용되지 않는 처리 단계입니다." };
    if (input.status2 === 4 && (!input.carrier?.trim() || !input.trackingNumber?.trim())) {
      return { ok: false, error: "교환 발송 택배사와 송장번호를 입력해주세요." };
    }
    const line = await tx.orderGoods.findFirst({ where: { uid: request.og_uid, order_num: request.order_num } });
    if (!line) return { ok: false, error: "주문상품을 확인할 수 없습니다." };
    const timestamp = now();
    if (input.status2 === 9) {
      const prior = await tx.orderLog.findFirst({ where: { order_num: request.order_num, og_uid: request.og_uid, status2: 0 }, orderBy: { uid: "desc" } });
      const previousStatus = prior?.status ?? (line.delivery_info ? 3 : 2);
      await tx.orderGoods.update({ where: { uid: line.uid }, data: { status: previousStatus, status2: 0, status_date: timestamp } });
      await tx.orderLog.create({ data: { order_num: request.order_num, og_uid: line.uid, id: input.actorId, prev_status: line.status, prev_status2: line.status2, status: previousStatus, status2: 0, signdate: timestamp } });
    } else {
      const delivery_info = input.status2 === 4 ? `${input.carrier!.trim()}|${input.trackingNumber!.trim()}` : line.delivery_info;
      await tx.orderGoods.update({ where: { uid: line.uid }, data: { status2: input.status2, status_date: timestamp, delivery_info } });
      await tx.orderLog.create({ data: { order_num: request.order_num, og_uid: line.uid, id: input.actorId, prev_status: line.status, prev_status2: line.status2, status: request.status, status2: input.status2, signdate: timestamp } });
    }
    await tx.orderStatusChange.update({ where: { uid: request.uid }, data: { manager: input.actorId, status2: input.status2, status_date: timestamp } });
    return { ok: true };
  });
  if (result.ok && input.status2 === 4) {
    const request = await prisma.orderStatusChange.findUnique({ where: { uid: input.uid } });
    const line = request ? await prisma.orderGoods.findUnique({ where: { uid: request.og_uid } }) : null;
    if (request && line) await notifyOrderShipped(request.order_num, [line], input.carrier ?? "", input.trackingNumber ?? "", true).catch(() => {});
  }
  return result;
}
