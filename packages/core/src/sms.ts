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

// Port of php/passwd_search_step_json.php's step2 SMS branch
// (mallSmsAuto('authcode', ...)).
export function renderPasswordResetCodeSms(params: { shopName: string; code: string }): string {
  return `[${params.shopName}] 비밀번호 재설정 인증코드는 ${params.code} 입니다. (5분 이내 입력)`;
}

// Port of lib.Shop.php's status3Sms()/mallRN_sms_auto type='delivery'
// template (ORDER_NAME/GOODS_NAME/DELIVERY_NAME/DELIVERY_NUM placeholders),
// hardcoded per this file's existing no-admin-template-table principle.
export function renderOrderShippedSms(params: {
  shopName: string;
  orderName: string;
  itemName: string;
  carrier: string;
  trackingNumber: string;
}): string {
  return `[${params.shopName}] ${params.orderName}님 주문하신 상품(${params.itemName})이 발송되었습니다. (${params.carrier} ${params.trackingNumber})`;
}

export type SmsLogListItem = {
  uid: number;
  cell: string;
  message: string;
  result: string;
  signdate: number;
};

export type SmsLogListResult = { items: SmsLogListItem[]; total: number; page: number; totalPages: number };

const SMS_LOG_PAGE_SIZE = 30;

// Port of managers/member/sms_list.php's read side — sendSms (above) has
// always written to mallRN_sms_list, but nothing ever read it back.
export async function getSmsLogList(filters: { keyword?: string }, page = 1): Promise<SmsLogListResult> {
  const where = filters.keyword ? { OR: [{ cell: { contains: filters.keyword } }, { message: { contains: filters.keyword } }] } : {};

  const total = await prisma.smsLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / SMS_LOG_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const rows = await prisma.smsLog.findMany({
    where,
    orderBy: { uid: "desc" },
    skip: (safePage - 1) * SMS_LOG_PAGE_SIZE,
    take: SMS_LOG_PAGE_SIZE,
  });

  return {
    items: rows.map((r) => ({ uid: r.uid, cell: r.cell, message: r.message, result: r.result, signdate: r.signdate })),
    total,
    page: safePage,
    totalPages,
  };
}
