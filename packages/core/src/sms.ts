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

export type SmsAutoTemplateItem = {
  uid: number;
  code: string;
  title: string;
  message1: string;
  message2: string;
  customerEnabled: boolean;
  adminEnabled: boolean;
  type: number;
};

function substituteTokens(text: string, tokens: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => tokens[key] ?? match);
}

export async function getSmsAutoTemplates(): Promise<SmsAutoTemplateItem[]> {
  const rows = await prisma.smsAuto.findMany({ orderBy: { uid: "asc" } });
  return rows.map((row) => ({
    uid: row.uid,
    code: row.code,
    title: row.title,
    message1: row.message1,
    message2: row.message2,
    customerEnabled: row.ck_message1 === 1,
    adminEnabled: row.ck_message2 === 1,
    type: row.type,
  }));
}

export async function updateSmsAutoTemplate(uid: number, input: { message1: string; message2: string; customerEnabled: boolean; adminEnabled: boolean }): Promise<void> {
  await prisma.smsAuto.update({
    where: { uid },
    data: { message1: input.message1, message2: input.message2, ck_message1: input.customerEnabled ? 1 : 0, ck_message2: input.adminEnabled ? 1 : 0 },
  });
}

export async function sendAutoSms(
  code: string,
  to: string,
  tokens: Record<string, string>,
  config: SmsConfig & Pick<ShopConfig, "basicName" | "smsAdminNumber1" | "smsAdminNumber2" | "smsAdminNumber3">,
): Promise<void> {
  const template = await prisma.smsAuto.findUnique({ where: { code } });
  if (!template) return;
  const values = { SHOPNAME: config.basicName, ...tokens };
  if ((template.type === 0 || template.type === 1) && template.ck_message1 === 1 && to && template.message1) {
    await sendSms({ to, text: substituteTokens(template.message1, values) }, config);
  }
  if ((template.type === 0 || template.type === 2) && template.ck_message2 === 1 && template.message2) {
    const message = substituteTokens(template.message2, values);
    for (const adminNumber of [config.smsAdminNumber1, config.smsAdminNumber2, config.smsAdminNumber3]) {
      if (adminNumber) await sendSms({ to: adminNumber, text: message }, config);
    }
  }
}

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

// Fallback text helpers retained for API compatibility and previews. Runtime
// automatic delivery uses sendAutoSms() and the admin-managed PHP templates.

export function renderOrderReceivedSms(params: { shopName: string; orderName: string; orderNum: string; price: number }): string {
  return `[${params.shopName}] ${params.orderName}님 주문이 접수되었습니다. (주문번호 ${params.orderNum}, ${params.price.toLocaleString("en-US")}원)`;
}

export function renderWelcomeSms(params: { shopName: string; memberName: string }): string {
  return `[${params.shopName}] ${params.memberName}님, 회원가입을 환영합니다.`;
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
