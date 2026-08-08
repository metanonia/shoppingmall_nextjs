import { prisma } from "@shoppingmall/db";
import { orderStatus4 } from "./order";

// Port of async_tracker.php's Sweet Tracker delivery-status poll. Same
// "no credentials configured -> gate the feature off" shape as
// payment.ts's PaymentGateway/getPaymentGateway — only the Noop path is
// exercisable in this dev environment (no real Sweet Tracker contract);
// the real provider is genuine code but only structurally verified, same
// as AronhubPaymentGateway in Phase 5. See MIGRATION.md's "나중에 확인" list.
export type CheckDeliveredResult = { delivered: boolean; error?: string };

export interface DeliveryTrackerProvider {
  readonly code: "NOOP" | "SWEETTRACKER";
  checkDelivered(carrier: string, trackingNumber: string): Promise<CheckDeliveredResult>;
}

export const NoopDeliveryTracker: DeliveryTrackerProvider = {
  code: "NOOP",
  async checkDelivered() {
    return { delivered: false };
  },
};

export class SweetTrackerProvider implements DeliveryTrackerProvider {
  readonly code = "SWEETTRACKER" as const;

  constructor(private readonly apiKey: string) {}

  async checkDelivered(carrier: string, trackingNumber: string): Promise<CheckDeliveredResult> {
    const url = `https://info.sweettracker.co.kr/api/v1/trackingInfo?t_key=${encodeURIComponent(this.apiKey)}&t_code=${encodeURIComponent(carrier)}&t_invoice=${encodeURIComponent(trackingNumber)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return { delivered: false, error: `HTTP ${res.status}` };
      const data: unknown = await res.json();
      const completeYN = (data as { completeYN?: string } | null)?.completeYN;
      return { delivered: completeYN === "Y" };
    } catch (err) {
      return { delivered: false, error: err instanceof Error ? err.message : "REQUEST_FAILED" };
    }
  }
}

export function getDeliveryTrackerProvider(): DeliveryTrackerProvider {
  const apiKey = process.env.SWEETTRACKER_API_KEY;
  if (!apiKey) return NoopDeliveryTracker;
  return new SweetTrackerProvider(apiKey);
}

export type PollDeliveryResult = { checked: number; delivered: number; provider: "NOOP" | "SWEETTRACKER" };

// Delivery_info is "택배사|송장번호" — the same format
// updateDeliveryProgress (order.ts) already writes when an admin/vendor
// enters tracking info, so no new column/format is introduced here.
export async function pollDeliveryTracking(): Promise<PollDeliveryResult> {
  const provider = getDeliveryTrackerProvider();
  const lines = await prisma.orderGoods.findMany({
    where: { status: 3, reals: 1, delivery_info: { not: "" } },
  });

  let delivered = 0;
  for (const line of lines) {
    const [carrier, trackingNumber] = line.delivery_info.split("|");
    if (!carrier || !trackingNumber) continue;
    const result = await provider.checkDelivered(carrier, trackingNumber);

    let status: 0 | 1 | 2 = 0;
    if (result.error) status = 2;
    else if (result.delivered) {
      await orderStatus4(line.order_num, line.uid, "system:tracker");
      delivered++;
      status = 1;
    }

    // Port of async_tracker.php's per-line audit insert (mallRN_delivery_api_log).
    await prisma.deliveryApiLog.create({
      data: {
        order_num: line.order_num,
        og_uid: line.uid,
        delivery_name: carrier,
        delivery_num: trackingNumber,
        status,
        message: result.error ?? "",
        signdate: Math.floor(Date.now() / 1000),
      },
    });
  }

  return { checked: lines.length, delivered, provider: provider.code };
}

export type DeliveryApiLogItem = {
  uid: number;
  orderNum: string;
  ogUid: number;
  deliveryName: string;
  deliveryNum: string;
  status: number;
  message: string;
  signdate: number;
};

export type DeliveryApiLogResult = { items: DeliveryApiLogItem[]; total: number; page: number; totalPages: number };

const DELIVERY_API_LOG_PAGE_SIZE = 30;

// Port of managers/etcs/delivery_api_log_list.php.
export async function getDeliveryApiLogList(filters: { keyword?: string; status?: number }, page = 1): Promise<DeliveryApiLogResult> {
  const where = {
    ...(filters.status !== undefined ? { status: filters.status } : {}),
    ...(filters.keyword ? { order_num: { contains: filters.keyword } } : {}),
  };

  const total = await prisma.deliveryApiLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / DELIVERY_API_LOG_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const rows = await prisma.deliveryApiLog.findMany({
    where,
    orderBy: { uid: "desc" },
    skip: (safePage - 1) * DELIVERY_API_LOG_PAGE_SIZE,
    take: DELIVERY_API_LOG_PAGE_SIZE,
  });

  return {
    items: rows.map((r) => ({
      uid: r.uid,
      orderNum: r.order_num,
      ogUid: r.og_uid,
      deliveryName: r.delivery_name,
      deliveryNum: r.delivery_num,
      status: r.status,
      message: r.message,
      signdate: r.signdate,
    })),
    total,
    page: safePage,
    totalPages,
  };
}
