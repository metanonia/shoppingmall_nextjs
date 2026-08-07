import { SignJWT, jwtVerify } from "jose";

// Replaces the legacy cookie scheme (lib/lib.Shop.php:19 makeLogin() issuing a
// base64 `my_id` cookie + md5(id+CONF_KEY) `sid` cookie, re-verified and
// re-queried against the DB on every request via lib/checkLogin.php /
// checkVLogin.php) with one signed, httpOnly JWT session cookie.
//
// This package is framework-agnostic — it only signs/verifies tokens. Reading
// and writing the actual cookie is the Next app's job (via next/headers),
// since apps/storefront and apps/backoffice each decide their own cookie
// name/options.
export const SESSION_COOKIE_NAME = "shoppingmall_session";

export type SessionRole = "member" | "admin" | "vendor";

export type SessionPayload = {
  userId: string;
  role: SessionRole;
  level: number;
  vendorId?: string;
};

function getSecretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signSession(
  payload: SessionPayload,
  secret: string,
  expiresIn: string = "7d",
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretKey(secret));
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(secret));
    if (
      typeof payload.userId === "string" &&
      typeof payload.role === "string" &&
      typeof payload.level === "number"
    ) {
      return payload as unknown as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}
