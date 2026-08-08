import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@shoppingmall/db";

// Port of lib.Shop.php:2945 mallMailSend(), which wraps PHPMailer over PHP's
// built-in mail() transport. Node has no equivalent built-in transport, so
// this picks one based on env, falling back to a transport that never
// touches the network — tests/CI must stay able to run offline.
//   1. SMTP_HOST set -> real SMTP (production/staging).
//   2. EMAIL_DEV_TRANSPORT=ethereal -> nodemailer's free throwaway SMTP
//      account, useful for a one-off manual check (logs a preview URL).
//   3. default -> JSON transport: builds the message but never sends it,
//      just logs it. Always "succeeds".
let cachedTransport: Transporter | null = null;

async function getMailTransport(): Promise<{ transporter: Transporter; kind: "smtp" | "ethereal" | "json" }> {
  if (process.env.SMTP_HOST) {
    if (!cachedTransport) {
      cachedTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      });
    }
    return { transporter: cachedTransport, kind: "smtp" };
  }

  if (process.env.EMAIL_DEV_TRANSPORT === "ethereal") {
    if (!cachedTransport) {
      const testAccount = await nodemailer.createTestAccount();
      cachedTransport = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    }
    return { transporter: cachedTransport, kind: "ethereal" };
  }

  if (!cachedTransport) cachedTransport = nodemailer.createTransport({ jsonTransport: true });
  return { transporter: cachedTransport, kind: "json" };
}

export type SendMailInput = { to: string; subject: string; html: string };
export type SendMailResult = { ok: boolean; transport: "smtp" | "ethereal" | "json"; previewUrl?: string; error?: string };

// Never throws — a notification failure must never take down the order flow
// that triggered it.
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  try {
    const { transporter, kind } = await getMailTransport();
    const from = process.env.SMTP_FROM || "no-reply@example.com";
    const info = await transporter.sendMail({ from, to: input.to, subject: input.subject, html: input.html });
    if (kind === "json") console.log("[mailer:json]", JSON.stringify(info));
    const previewUrl = kind === "ethereal" ? nodemailer.getTestMessageUrl(info) || undefined : undefined;
    if (previewUrl) console.log("[mailer:ethereal] preview:", previewUrl);
    return { ok: true, transport: kind, previewUrl };
  } catch (err) {
    return { ok: false, transport: "json", error: err instanceof Error ? err.message : "SEND_FAILED" };
  }
}

// Port of managers/design/mail_*.php's mallRN_auto_mail-backed templates —
// simplified from legacy's 2-tier {LOOP_*}/{TOKEN} templating engine (which
// loops over vendor groups and goods lines inside the template text itself)
// to a single flat {TOKEN} substitution pass. The line-item table stays
// server-rendered HTML handed in as one token (GOODS_TABLE) rather than
// something the admin's template text can loop over — replicating a real
// nested-loop template engine for 4 email types isn't worth the complexity
// it'd add. An admin who hasn't customized a template (AutoMail.used=0, the
// seeded default — see packages/db/sql/016_automail.sql) gets this file's
// hardcoded default, unchanged from before this table existed.
export type AutoMailTemplateItem = { type: string; used: boolean; subject: string; content: string };

const AUTO_MAIL_LABELS: Record<string, string> = {
  order_received: "주문 접수 안내",
  order_paid: "결제 완료 안내",
  passwd: "비밀번호 재설정 인증코드",
  sleep: "휴면계정 전환 예정 안내",
};
export const AUTO_MAIL_TYPES = Object.keys(AUTO_MAIL_LABELS);

export function autoMailLabel(type: string): string {
  return AUTO_MAIL_LABELS[type] ?? type;
}

// Admin CRUD for the 4 seeded AutoMail rows (packages/db/sql/016_automail.sql)
// — always an update, never a create, since every type is guaranteed to
// exist from the seed.
export async function getAutoMailTemplates(): Promise<AutoMailTemplateItem[]> {
  const rows = await prisma.autoMail.findMany({ where: { type: { in: AUTO_MAIL_TYPES } } });
  const byType = new Map(rows.map((r) => [r.type, r]));
  return AUTO_MAIL_TYPES.map((type) => {
    const row = byType.get(type);
    return { type, used: row?.used === 1, subject: row?.subject ?? "", content: row?.content ?? "" };
  });
}

export async function updateAutoMailTemplate(type: string, input: { used: boolean; subject: string; content: string }): Promise<void> {
  if (!AUTO_MAIL_TYPES.includes(type)) return;
  await prisma.autoMail.update({
    where: { type },
    data: { used: input.used ? 1 : 0, subject: input.subject, content: input.content, signdate: Math.floor(Date.now() / 1000) },
  });
}

export type RenderedEmail = { subject: string; html: string };

function substituteTokens(text: string, tokens: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => tokens[key] ?? match);
}

async function renderAutoMail(type: string, defaultSubject: string, defaultHtml: string, tokens: Record<string, string>): Promise<RenderedEmail> {
  const template = await prisma.autoMail.findFirst({ where: { type, used: 1 } });
  if (!template) return { subject: defaultSubject, html: defaultHtml };
  return {
    subject: substituteTokens(template.subject || defaultSubject, tokens),
    html: substituteTokens(template.content || defaultHtml, tokens),
  };
}

export async function renderOrderReceivedEmail(params: {
  shopName: string;
  orderNum: string;
  lines: { goodsName: string; qty: number; lineTotal: number }[];
  payTotal: number;
}): Promise<RenderedEmail> {
  const rows = params.lines
    .map((l) => `<tr><td>${l.goodsName}</td><td>${l.qty}</td><td>${l.lineTotal.toLocaleString("en-US")}원</td></tr>`)
    .join("");
  const defaultHtml = `<h2>${params.shopName} 주문 접수</h2><p>주문번호: ${params.orderNum}</p><table>${rows}</table><p>결제금액: ${params.payTotal.toLocaleString("en-US")}원</p>`;
  return renderAutoMail("order_received", `[${params.shopName}] 주문이 접수되었습니다`, defaultHtml, {
    SHOPNAME: params.shopName,
    ORDERNUM: params.orderNum,
    GOODS_TABLE: rows,
    PAYTOTAL: params.payTotal.toLocaleString("en-US"),
  });
}

// Port of php/passwd_search_step_json.php's step2 email branch.
export async function renderPasswordResetCodeEmail(params: { shopName: string; code: string }): Promise<RenderedEmail> {
  const defaultHtml = `<h2>${params.shopName} 비밀번호 재설정 인증코드</h2><p>인증코드: <b>${params.code}</b></p><p>5분 이내에 입력해 주세요.</p>`;
  return renderAutoMail("passwd", `[${params.shopName}] 비밀번호 재설정 인증코드`, defaultHtml, {
    SHOPNAME: params.shopName,
    AUTHCODE: params.code,
  });
}

// Port of async_day_proc.php's 30-day-ahead dormant-member warning — sent
// once, on the day a member crosses 335 days since last login (see
// scheduled-jobs.ts's processDormantMembers).
export async function renderDormantWarningEmail(params: { shopName: string; memberName: string; daysUntilSleep: number }): Promise<RenderedEmail> {
  const defaultHtml = `<h2>${params.shopName} 휴면계정 전환 예정 안내</h2><p>${params.memberName}님, 장기간 로그인하지 않아 ${params.daysUntilSleep}일 후 휴면계정으로 전환될 예정입니다.</p><p>계속 이용하시려면 로그인해 주세요.</p>`;
  return renderAutoMail("sleep", `[${params.shopName}] 휴면계정 전환 예정 안내`, defaultHtml, {
    SHOPNAME: params.shopName,
    NAME: params.memberName,
    DAYS: String(params.daysUntilSleep),
  });
}

export async function renderOrderPaidEmail(params: {
  shopName: string;
  orderNum: string;
  lines: { goodsName: string; qty: number; lineTotal: number }[];
  payTotal: number;
}): Promise<RenderedEmail> {
  const rows = params.lines
    .map((l) => `<tr><td>${l.goodsName}</td><td>${l.qty}</td><td>${l.lineTotal.toLocaleString("en-US")}원</td></tr>`)
    .join("");
  const defaultHtml = `<h2>${params.shopName} 결제 완료</h2><p>주문번호: ${params.orderNum}</p><table>${rows}</table><p>결제금액: ${params.payTotal.toLocaleString("en-US")}원</p>`;
  return renderAutoMail("order_paid", `[${params.shopName}] 결제가 완료되었습니다`, defaultHtml, {
    SHOPNAME: params.shopName,
    ORDERNUM: params.orderNum,
    GOODS_TABLE: rows,
    PAYTOTAL: params.payTotal.toLocaleString("en-US"),
  });
}
