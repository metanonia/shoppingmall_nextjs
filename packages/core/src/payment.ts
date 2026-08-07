import type { ShopConfig } from "./config";
import { AronhubPaymentGateway } from "./payment-aronhub";

export type PgPayType = "C" | "H";

export type PaymentRequestInput = {
  orderNum: string;
  amount: number;
  payType: PgPayType;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  itemName: string;
  returnUrl: string;
  userUrl: string;
  cancelUrl: string;
};

export type PaymentRequestResult =
  | { kind: "form-post"; actionUrl: string; fields: Record<string, string> }
  | { kind: "redirect"; url: string };

export type CallbackParseResult =
  | { ok: true; orderNum: string; amount: number; pgTransactionId: string }
  | { ok: false; reason: string };

export type CancelInput = { payType: PgPayType; pgTransactionId: string; amount: number };
export type PaymentCancelResult = { ok: true } | { ok: false; reason: string };

// Protocol-level PG adapter. Domain checks (order exists, amount matches,
// already processed) are deliberately NOT this interface's job — see
// order.ts's confirmPgPayment(), which is where the legacy gap ("아론허브
// 콜백엔 서명검증이 전혀 없음") actually gets closed.
export interface PaymentGateway {
  readonly code: "MOCK" | "ARONHUB";
  createPaymentRequest(input: PaymentRequestInput): Promise<PaymentRequestResult>;
  parseCallback(raw: Record<string, string>): CallbackParseResult;
  cancelPayment(input: CancelInput): Promise<PaymentCancelResult>;
}

// Local dev/test gateway — no real PG involved. createPaymentRequest points
// at our own mock checkout route, which acts as both the "payment window"
// and its own callback (the route calls confirmPgPayment directly instead of
// round-tripping through parseCallback — see app/api/payment/mock/checkout).
export const MockPaymentGateway: PaymentGateway = {
  code: "MOCK",
  async createPaymentRequest(input) {
    const url = new URL("/api/payment/mock/checkout", input.returnUrl);
    url.searchParams.set("orderNum", input.orderNum);
    return { kind: "redirect", url: url.toString() };
  },
  parseCallback() {
    return { ok: false, reason: "MOCK_GATEWAY_DOES_NOT_PARSE_CALLBACKS" };
  },
  async cancelPayment() {
    return { ok: true };
  },
};

// Port of plugin/aronhub/site_conf_inc.php's config resolution, generalized
// to any PG: only used when payment_cp is explicitly set AND the pay-type's
// merchant id column is filled in. Falls back to Mock otherwise, per pay
// type independently (a shop could have card contracted but not phone) — the
// same "no credentials configured yet -> gate the feature off" pattern as
// getSocialAppConfig()/getEnabledSocialProviders() in social.ts. Once real
// keys are added to the Configuration row, this switches over with no code
// change.
export function getPaymentGateway(
  payType: PgPayType,
  config: Pick<ShopConfig, "paymentCp" | "paymentShopId" | "paymentShopKey">,
): PaymentGateway {
  if (config.paymentCp !== "ARONHUB") return MockPaymentGateway;
  const sid = payType === "C" ? config.paymentShopId : config.paymentShopKey;
  if (!sid) return MockPaymentGateway;
  return new AronhubPaymentGateway(config);
}
