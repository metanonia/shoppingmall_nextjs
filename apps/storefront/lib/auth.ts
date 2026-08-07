import { cache } from "react";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, signSession, verifySession, type SessionPayload } from "@shoppingmall/auth";

// Replaces lib/checkLogin.php's my_id/sid cookie pair with one signed JWT
// cookie — see packages/auth/src/session.ts for why. This file is the
// Next.js-specific half (cookies() access); packages/auth stays
// framework-agnostic so apps/backoffice can reuse it later.
const SECRET = process.env.AUTH_SECRET;
if (!SECRET) throw new Error("AUTH_SECRET is not set");

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload, SECRET);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

// cache()'d so a page that calls this more than once in one request (layout
// + page) only verifies the cookie once.
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token, SECRET);
});
