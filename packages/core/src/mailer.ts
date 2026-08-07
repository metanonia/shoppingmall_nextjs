import nodemailer, { type Transporter } from "nodemailer";

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

// Simplified fixed templates — legacy's mallRN_auto_mail 'order' template is
// a large admin-editable loop over vendor groups; there's no admin screen
// here (Phase 7), so this is a compact hardcoded layout instead.
export function renderOrderReceivedEmail(params: {
  shopName: string;
  orderNum: string;
  lines: { goodsName: string; qty: number; lineTotal: number }[];
  payTotal: number;
}): string {
  const rows = params.lines
    .map((l) => `<tr><td>${l.goodsName}</td><td>${l.qty}</td><td>${l.lineTotal.toLocaleString("en-US")}원</td></tr>`)
    .join("");
  return `<h2>${params.shopName} 주문 접수</h2><p>주문번호: ${params.orderNum}</p><table>${rows}</table><p>결제금액: ${params.payTotal.toLocaleString("en-US")}원</p>`;
}

export function renderOrderPaidEmail(params: {
  shopName: string;
  orderNum: string;
  lines: { goodsName: string; qty: number; lineTotal: number }[];
  payTotal: number;
}): string {
  const rows = params.lines
    .map((l) => `<tr><td>${l.goodsName}</td><td>${l.qty}</td><td>${l.lineTotal.toLocaleString("en-US")}원</td></tr>`)
    .join("");
  return `<h2>${params.shopName} 결제 완료</h2><p>주문번호: ${params.orderNum}</p><table>${rows}</table><p>결제금액: ${params.payTotal.toLocaleString("en-US")}원</p>`;
}
