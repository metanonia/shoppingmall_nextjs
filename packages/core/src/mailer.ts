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

// Port of managers/design/mail_*.php's mallRN_auto_mail-backed templates.
// Order line groups are rendered into GOODS_TABLE before token substitution;
// all messages are then wrapped in the editable `common` layout, matching
// mallMailSend() in lib.Shop.php.
export type AutoMailTemplateItem = { type: string; enabled: boolean; used: boolean; subject: string; content: string };

const AUTO_MAIL_LABELS: Record<string, string> = {
  common: "자동메일 공통 레이아웃",
  join: "회원가입 축하 안내",
  vjoin: "판매사 가입 축하 안내",
  order_received: "주문 접수 안내",
  order_paid: "결제 완료 안내",
  delivery: "상품 발송 안내",
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
    return { type, enabled: row?.send === 1, used: row?.used === 1, subject: row?.subject ?? "", content: row?.content ?? "" };
  });
}

export async function updateAutoMailTemplate(type: string, input: { enabled: boolean; used: boolean; subject: string; content: string }): Promise<void> {
  if (!AUTO_MAIL_TYPES.includes(type)) return;
  await prisma.autoMail.update({
    where: { type },
    data: { send: input.enabled ? 1 : 0, used: input.used ? 1 : 0, subject: input.subject, content: input.content, signdate: Math.floor(Date.now() / 1000) },
  });
}

export type RenderedEmail = { subject: string; html: string };

function substituteTokens(text: string, tokens: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => tokens[key] ?? match);
}

async function renderAutoMail(
  type: string,
  defaultSubject: string,
  defaultHtml: string,
  tokens: Record<string, string>,
): Promise<RenderedEmail>;
async function renderAutoMail(
  type: string,
  defaultSubject: string,
  defaultHtml: string,
  tokens: Record<string, string>,
  respectSend: true,
): Promise<RenderedEmail | null>;
async function renderAutoMail(
  type: string,
  defaultSubject: string,
  defaultHtml: string,
  tokens: Record<string, string>,
  respectSend = false,
): Promise<RenderedEmail | null> {
  const template = await prisma.autoMail.findUnique({ where: { type } });
  if (respectSend && template?.send !== 1) return null;
  const rendered = !template || template.used !== 1 ? { subject: defaultSubject, html: defaultHtml } : {
    subject: substituteTokens(template.subject || defaultSubject, tokens),
    html: substituteTokens(template.content || defaultHtml, tokens),
  };
  if (type === "common") return rendered;
  return { ...rendered, html: await wrapCommonLayout(rendered.html) };
}

async function wrapCommonLayout(content: string): Promise<string> {
  const [template, config] = await Promise.all([
    prisma.autoMail.findUnique({ where: { type: "common" } }),
    prisma.configuration.findUnique({ where: { uid: 1 } }),
  ]);
  if (!template?.content || !config) return content;
  return substituteTokens(template.content, {
    CONTENT: content,
    CSURL: `${config.basic_url.replace(/\/$/, "")}/cs_center`,
    COMPANY: config.comp_name,
    OWNER: config.comp_owner,
    COMPNUM: config.comp_license_no1,
    ADDRESS: `${config.comp_address1} ${config.comp_address2}`.trim(),
    TEL: config.comp_tel,
    SHOPNAME: config.basic_name,
  });
}

export async function renderOrderReceivedEmail(params: {
  shopName: string;
  orderNum: string;
  lines: { goodsName: string; qty: number; lineTotal: number }[];
  payTotal: number;
}): Promise<RenderedEmail | null> {
  const rows = params.lines
    .map((l) => `<tr><td>${l.goodsName}</td><td>${l.qty}</td><td>${l.lineTotal.toLocaleString("en-US")}원</td></tr>`)
    .join("");
  const defaultHtml = `<h2>${params.shopName} 주문 접수</h2><p>주문번호: ${params.orderNum}</p><table>${rows}</table><p>결제금액: ${params.payTotal.toLocaleString("en-US")}원</p>`;
  return renderAutoMail("order_received", `[${params.shopName}] 주문이 접수되었습니다`, defaultHtml, {
    SHOPNAME: params.shopName,
    ORDERNUM: params.orderNum,
    GOODS_TABLE: rows,
    PAYTOTAL: params.payTotal.toLocaleString("en-US"),
  }, true);
}

// Port of php/passwd_search_step_json.php's step2 email branch.
export async function renderPasswordResetCodeEmail(params: { shopName: string; code: string }): Promise<RenderedEmail> {
  const defaultHtml = `<h2>${params.shopName} 비밀번호 재설정 인증코드</h2><p>인증코드: <b>${params.code}</b></p><p>5분 이내에 입력해 주세요.</p>`;
  return renderAutoMail("passwd", `[${params.shopName}] 비밀번호 재설정 인증코드`, defaultHtml, {
    SHOPNAME: params.shopName,
    AUTHCODE: params.code,
  });
}

export async function renderWelcomeEmail(params: {
  shopName: string;
  memberId: string;
  memberName: string;
  smsAccepted: boolean;
  mailAccepted: boolean;
  changedAt: Date;
}): Promise<RenderedEmail | null> {
  const changedAt = params.changedAt.toLocaleString("ko-KR");
  const defaultHtml = `<h2>${params.shopName} 회원가입을 축하드립니다.</h2><p>${params.memberName}님의 가입 아이디는 ${params.memberId}입니다.</p><p>SMS 수신: ${params.smsAccepted ? "동의함" : "동의안함"}<br>이메일 수신: ${params.mailAccepted ? "동의함" : "동의안함"}</p>`;
  return renderAutoMail("join", `[${params.shopName}] 회원가입을 진심으로 환영합니다.`, defaultHtml, {
    SHOPNAME: params.shopName,
    ID: params.memberId,
    NAME: params.memberName,
    SMSYN: params.smsAccepted ? "동의함" : "동의안함",
    SMSDATE: changedAt,
    MAILYN: params.mailAccepted ? "동의함" : "동의안함",
    MAILDATE: changedAt,
  }, true);
}

export async function renderVendorWelcomeEmail(params: {
  shopName: string;
  vendorId: string;
  vendorName: string;
}): Promise<RenderedEmail | null> {
  const defaultHtml = `<h2>${params.shopName} 판매사 가입을 축하드립니다.</h2><p>${params.vendorName}님의 판매사 아이디는 ${params.vendorId}입니다.</p>`;
  return renderAutoMail("vjoin", `[${params.shopName}] 판매사 가입을 진심으로 환영합니다.`, defaultHtml, {
    SHOPNAME: params.shopName,
    ID: params.vendorId,
    NAME: params.vendorName,
  }, true);
}

export async function renderOrderShippedEmail(params: {
  shopName: string;
  receiverName: string;
  receiverCell: string;
  receiverAddress: string;
  orderDate: Date;
  goodsName: string;
  deliveryDate: Date;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  exchange?: boolean;
}): Promise<RenderedEmail | null> {
  const date = (value: Date) => value.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
  const receiverInfo = `${params.receiverName} / ${params.receiverCell} / ${params.receiverAddress}`;
  const deliveryLabel = params.exchange ? "교환 발송" : "발송";
  const defaultHtml = `<h2>주문하신 상품이 ${deliveryLabel}되었습니다.</h2><p>${date(params.orderDate)}에 주문하신 ${params.goodsName} 상품이 ${date(params.deliveryDate)}에 ${deliveryLabel}되었습니다.</p><p>택배사: ${params.carrier}<br>송장번호: ${params.trackingNumber}</p><p><a href="${params.trackingUrl}">배송조회하기</a></p><p>${receiverInfo}</p>`;
  return renderAutoMail("delivery", `[${params.shopName}] ${params.receiverName}님, 주문하신 상품이 ${deliveryLabel}되었습니다.`, defaultHtml, {
    SHOPNAME: params.shopName,
    ORDER_DATE: date(params.orderDate),
    GOODS_NAME: params.goodsName,
    DELIVERY_DATE: date(params.deliveryDate),
    DELIVERY_NAME: params.carrier,
    DELIVERY_NUM: params.trackingNumber,
    DELIVERY_LINK: params.trackingUrl,
    RECIEVER_INFO: receiverInfo,
  }, true);
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
}): Promise<RenderedEmail | null> {
  const rows = params.lines
    .map((l) => `<tr><td>${l.goodsName}</td><td>${l.qty}</td><td>${l.lineTotal.toLocaleString("en-US")}원</td></tr>`)
    .join("");
  const defaultHtml = `<h2>${params.shopName} 결제 완료</h2><p>주문번호: ${params.orderNum}</p><table>${rows}</table><p>결제금액: ${params.payTotal.toLocaleString("en-US")}원</p>`;
  return renderAutoMail("order_paid", `[${params.shopName}] 결제가 완료되었습니다`, defaultHtml, {
    SHOPNAME: params.shopName,
    ORDERNUM: params.orderNum,
    GOODS_TABLE: rows,
    PAYTOTAL: params.payTotal.toLocaleString("en-US"),
  }, true);
}
