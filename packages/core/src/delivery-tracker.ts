import { prisma } from "@shoppingmall/db";
import { orderStatus4 } from "./order";

// Port of async_tracker.php's Sweet Tracker delivery-status poll. Same
// "no credentials configured -> gate the feature off" shape as
// payment.ts's PaymentGateway/getPaymentGateway — only the Noop path is
// exercisable in this dev environment (no real Sweet Tracker contract);
// the real provider is genuine code but only structurally verified, same
// as AronhubPaymentGateway in Phase 5. See MIGRATION.md's "나중에 확인" list.
export interface DeliveryTrackerProvider {
  readonly code: "NOOP" | "SWEETTRACKER";
  checkDelivered(carrier: string, trackingNumber: string): Promise<{ delivered: boolean }>;
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

  async checkDelivered(carrier: string, trackingNumber: string): Promise<{ delivered: boolean }> {
    const url = `https://info.sweettracker.co.kr/api/v1/trackingInfo?t_key=${encodeURIComponent(this.apiKey)}&t_code=${encodeURIComponent(carrier)}&t_invoice=${encodeURIComponent(trackingNumber)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return { delivered: false };
      const data: unknown = await res.json();
      const completeYN = (data as { completeYN?: string } | null)?.completeYN;
      return { delivered: completeYN === "Y" };
    } catch {
      return { delivered: false };
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
    if (result.delivered) {
      await orderStatus4(line.order_num, line.uid, "system:tracker");
      delivered++;
    }
  }

  return { checked: lines.length, delivered, provider: provider.code };
}
