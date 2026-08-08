import { createSign } from "node:crypto";
import { prisma } from "@shoppingmall/db";

type ServiceAccount = { client_email: string; private_key: string; project_id: string; token_uri?: string };

function base64url(value: string | Buffer) { return Buffer.from(value).toString("base64url"); }

async function accessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({ iss: account.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: account.token_uri ?? "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256"); signer.update(unsigned); signer.end();
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString("base64url")}`;
  const response = await fetch(account.token_uri ?? "https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  if (!response.ok) throw new Error(`FCM_OAUTH_${response.status}`);
  return String((await response.json() as { access_token: string }).access_token);
}

export type PushResult = { sent: number; failed: number; skipped: boolean };

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
};

export async function getFirebaseWebConfig(): Promise<FirebaseWebConfig> {
  const row = await prisma.configuration.findUniqueOrThrow({ where: { uid: 1 } });
  return {
    apiKey: row.push_apiKey,
    authDomain: row.push_authDomain,
    projectId: row.push_projectId,
    storageBucket: row.push_storageBucket,
    messagingSenderId: row.push_messagingSenderId,
    appId: row.push_appId,
    vapidKey: row.push_server_key2,
  };
}

export async function updateFirebaseWebConfig(input: FirebaseWebConfig): Promise<void> {
  await prisma.configuration.update({
    where: { uid: 1 },
    data: {
      push_apiKey: input.apiKey.trim(),
      push_authDomain: input.authDomain.trim(),
      push_projectId: input.projectId.trim(),
      push_storageBucket: input.storageBucket.trim(),
      push_messagingSenderId: input.messagingSenderId.trim(),
      push_appId: input.appId.trim(),
      push_server_key2: input.vapidKey.trim(),
    },
  });
}

// Modern HTTP v1 replacement for legacy fcmSend(). Recipients remain the
// same admin/vendor token columns; credentials come from a service-account
// JSON environment variable because legacy server keys are retired.
export async function sendPushNotification(title: string, body: string, vendorIds: string[] = []): Promise<PushResult> {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw) return { sent: 0, failed: 0, skipped: true };
  const account = JSON.parse(raw) as ServiceAccount;
  const [admins, vendors] = await Promise.all([
    prisma.adminConfiguration.findMany({ where: { push_yn: "Y" }, select: { token_pc: true, token_mobile: true } }),
    vendorIds.length ? prisma.vendorConfiguration.findMany({ where: { vendor: { in: vendorIds }, push_yn: "Y" }, select: { token_pc: true, token_mobile: true } }) : [],
  ]);
  const tokens = Array.from(new Set([...admins, ...vendors].flatMap((row) => [row.token_pc, row.token_mobile]).filter(Boolean)));
  if (!tokens.length) return { sent: 0, failed: 0, skipped: false };
  const bearer = await accessToken(account);
  let sent = 0, failed = 0;
  for (const token of tokens) {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, { method: "POST", headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" }, body: JSON.stringify({ message: { token, notification: { title, body } } }) });
    if (response.ok) sent++; else failed++;
  }
  return { sent, failed, skipped: false };
}

export async function updateAdminPushToken(adminId: string, input: { enabled: boolean; pc: string; mobile: string }): Promise<void> {
  await prisma.adminConfiguration.upsert({ where: { id: adminId }, create: { id: adminId, push_yn: input.enabled ? "Y" : "N", token_pc: input.pc, token_mobile: input.mobile }, update: { push_yn: input.enabled ? "Y" : "N", token_pc: input.pc, token_mobile: input.mobile } });
}

export async function updateVendorPushToken(vendorId: string, input: { enabled: boolean; pc: string; mobile: string }): Promise<void> {
  await prisma.vendorConfiguration.updateMany({ where: { vendor: vendorId }, data: { push_yn: input.enabled ? "Y" : "N", token_pc: input.pc, token_mobile: input.mobile } });
}

export async function getAdminPushToken(adminId: string) {
  const row = await prisma.adminConfiguration.findUnique({ where: { id: adminId } });
  return { enabled: row?.push_yn === "Y", pc: row?.token_pc ?? "", mobile: row?.token_mobile ?? "" };
}

export async function getVendorPushToken(vendorId: string) {
  const row = await prisma.vendorConfiguration.findFirst({ where: { vendor: vendorId } });
  return { enabled: row?.push_yn === "Y", pc: row?.token_pc ?? "", mobile: row?.token_mobile ?? "" };
}
