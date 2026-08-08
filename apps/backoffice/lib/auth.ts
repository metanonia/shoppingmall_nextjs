import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { signSession, verifySession, type SessionPayload } from "@shoppingmall/auth";

// Next.js-specific half of session handling (cookies() access), mirroring
// apps/storefront/lib/auth.ts. Uses its own cookie name rather than the
// shared @shoppingmall/auth SESSION_COOKIE_NAME constant — storefront and
// backoffice run on the same host in dev (only the port differs), and
// browsers don't scope cookies by port, so sharing a cookie name would let
// an admin login silently clobber a member session in the same browser.
const ADMIN_SESSION_COOKIE_NAME = "shoppingmall_admin_session";

function requireAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

const SECRET = requireAuthSecret();

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload, SECRET);
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE_NAME);
}

// cache()'d so a page that calls this more than once in one request (layout
// + page) only verifies the cookie once. Returns null for a valid session
// whose role isn't "admin" or "vendor" — a member token that wandered in via
// the shared-host cookie situation above should never be treated as logged
// in here, only ever explicitly rejected. Phase 7 only ever issued "admin"
// sessions; Phase 8 adds "vendor" ones (same app, same cookie, role-branched
// route groups — see app/(protected) vs app/vendor).
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySession(token, SECRET);
  if (!payload || (payload.role !== "admin" && payload.role !== "vendor")) return null;
  return payload;
});

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login");
  return session;
}

export async function requireBackofficeUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireVendor(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== "vendor") redirect("/vendor");
  return session;
}
