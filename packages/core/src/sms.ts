import { createHmac } from "node:crypto";
import { prisma } from "@shoppingmall/db";
import type { ShopConfig } from "./config";

function now(): number {
  return Math.floor(Date.now() / 1000);
}

export type SmsConfig = Pick<ShopConfig, "smsYn" | "smsKey" | "smsSecret" | "smsCallingNumber">;

// Port of plugin/coolSMS/lib/message.php:6-14 get_header() — pure function so
// the signature math is unit-testable without a live API key.
export function signCoolSmsAuthHeader(apiKey: string, apiSecret: string, date: Date = new Date()): string {
  const dateStr = date.toISOString();
  const salt = crypto.randomUUID().replace(/-/g, "");
  const signature = createHmac("sha256", apiSecret).update(dateStr + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${dateStr}, salt=${salt}, signature=${signature}`;
}

export type SmsMessage = { to: string; text: string };
export type SendSmsResult = { ok: boolean; skipped?: boolean; error?: string };

// Port of lib.Shop.php:3041 mallSmsSend() -> plugin/coolSMS/lib/message.php's
// send_messages() (POST /messages/v4/send). Unlike legacy, this never throws
// — a notification failure must never take down the order flow that
// triggered it. With no coolSMS credentials configured, this logs a skipped
// row to mallRN_sms_list instead of calling out to a paid API that isn't set
// up (config.smsYn/smsKey/smsSecret/smsCallingNumber all need to be present).
export async function sendSms(message: SmsMessage, config: SmsConfig): Promise<SendSmsResult> {
  if (config.smsYn !== "Y" || !config.smsKey || !config.smsSecret || !config.smsCallingNumber) {
    await prisma.smsLog.create({
      data: {
        cell: message.to,
        message: message.text,
        result: "SKIPPED_NO_CREDENTIALS",
        signdate: now(),
      },
    });
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.coolsms.co.kr/messages/v4/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: signCoolSmsAuthHeader(config.smsKey, config.smsSecret),
      },
      body: JSON.stringify({ message: { to: message.to, from: config.smsCallingNumber, text: message.text } }),
    });
    const json = await res.json();
    const ok = res.ok;
    await prisma.smsLog.create({
      data: {
        cell: message.to,
        message: message.text,
        groupId: json.groupId ?? "",
        messageId: json.messageId ?? "",
        accountId: json.accountId ?? "",
        result: ok ? "SENT" : JSON.stringify(json).slice(0, 250),
        status: ok ? 1 : 0,
        signdate: now(),
      },
    });
    return ok ? { ok: true } : { ok: false, error: "SEND_FAILED" };
  } catch (err) {
    const error = err instanceof Error ? err.message : "NETWORK_ERROR";
    await prisma.smsLog.create({
      data: { cell: message.to, message: message.text, result: `ERROR: ${error}`.slice(0, 250), signdate: now() },
    });
    return { ok: false, error };
  }
}

// Templates below port the legacy mallRN_sms_auto seed rows ('order',
// 'pay_ok', 'pay_ok2') as hardcoded TS functions — there's no admin screen
// to manage SMS templates yet (Phase 7), so a template table isn't added.

export function renderOrderReceivedSms(params: { shopName: string; orderName: string; orderNum: string; price: number }): string {
  return `[${params.shopName}] ${params.orderName}님 주문이 접수되었습니다. (주문번호 ${params.orderNum}, ${params.price.toLocaleString("en-US")}원)`;
}

export function renderOrderPaidSms(params: { shopName: string; orderName: string; orderNum: string; price: number }): string {
  return `[${params.shopName}] ${params.orderName}님 결제가 완료되었습니다. (주문번호 ${params.orderNum}, ${params.price.toLocaleString("en-US")}원)`;
}

export function renderVendorPaidSms(params: { shopName: string; orderName: string }): string {
  return `[${params.shopName}] ${params.orderName}님이 주문한 상품의 결제가 완료되었습니다.`;
}
