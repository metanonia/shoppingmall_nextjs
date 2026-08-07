import type { ShopConfig } from "./config";
import type {
  CallbackParseResult,
  CancelInput,
  PaymentCancelResult,
  PaymentGateway,
  PaymentRequestInput,
  PaymentRequestResult,
  PgPayType,
} from "./payment";

const ARONHUB_BASE = "https://api.aronhub.com/api/danal";

function actionUrlFor(payType: PgPayType, action: "Start" | "Cancel"): string {
  const segment = payType === "C" ? "card1" : "phone";
  return `${ARONHUB_BASE}/${segment}/${action}.asp`;
}

// Port of plugin/aronhub/order.php (widget request) + payResult.php
// (callback parsing) + cancelResult.php (refund). Card (C) and phone (H)
// only — the legacy plugin directory has no form fields, no Start/Cancel
// endpoint, and no goods_info builder for virtual-account or
// realtime-transfer, so aronhub genuinely cannot serve those two pay types.
export class AronhubPaymentGateway implements PaymentGateway {
  readonly code = "ARONHUB" as const;

  constructor(private readonly config: Pick<ShopConfig, "paymentShopId" | "paymentShopKey">) {}

  // Port of plugin/aronhub/order.php:15-51's hidden `order_info` form.
  // Legacy also sends `ITEMCODE`, always empty in this app (goods aren't
  // modeled with a separate PG item code).
  async createPaymentRequest(input: PaymentRequestInput): Promise<PaymentRequestResult> {
    const sid = input.payType === "C" ? this.config.paymentShopId : this.config.paymentShopKey;
    return {
      kind: "form-post",
      actionUrl: actionUrlFor(input.payType, "Start"),
      fields: {
        SID: sid,
        USERID: input.buyerId || "guest",
        AMOUNT: String(input.amount),
        ORDERID: input.orderNum,
        ITEMNAME: input.itemName,
        ITEMCODE: "",
        RETURNURL: input.returnUrl,
        USERURL: input.userUrl,
        CANCELURL: input.cancelUrl,
        USERNAME: input.buyerName,
        USEREMAIL: input.buyerEmail,
      },
    };
  }

  // Port of plugin/aronhub/payResult.php:29-36's required-field check —
  // that's genuinely all the validation the legacy callback does (no
  // signature/hash). Order lookup, amount verification against the DB, and
  // idempotency are deliberately NOT here — see order.ts's
  // confirmPgPayment(), which is where that gap actually gets closed.
  parseCallback(raw: Record<string, string>): CallbackParseResult {
    const { SID, USERID, USERIP, AMOUNT, MCTTRNO, ORDERID } = raw;
    if (!SID || !USERID || !USERIP || !AMOUNT || !MCTTRNO || !ORDERID) {
      return { ok: false, reason: "MISSING_FIELDS" };
    }
    const amount = Number(AMOUNT);
    if (!Number.isFinite(amount)) return { ok: false, reason: "INVALID_AMOUNT" };
    return { ok: true, orderNum: ORDERID, amount, pgTransactionId: MCTTRNO };
  }

  // Port of plugin/aronhub/cancelResult.php. No partial-cancel API exists in
  // aronhub (order_cancel.php 404s on mode=partial_cancel) — `amount` is
  // accepted for audit-log purposes only and never sent to aronhub.
  async cancelPayment(input: CancelInput): Promise<PaymentCancelResult> {
    const sid = input.payType === "C" ? this.config.paymentShopId : this.config.paymentShopKey;
    const body = new URLSearchParams({ SID: sid, TRANSACTIONID: input.pgTransactionId });
    try {
      const res = await fetch(actionUrlFor(input.payType, "Cancel"), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=euc-kr" },
        body: body.toString(),
      });
      const json: { ReplyCode?: string } = await res.json();
      if (json.ReplyCode === "000000") return { ok: true };
      return { ok: false, reason: `ARONHUB_${json.ReplyCode ?? "UNKNOWN"}` };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : "NETWORK_ERROR" };
    }
  }
}
