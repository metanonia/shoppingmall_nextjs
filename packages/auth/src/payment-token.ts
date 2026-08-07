import { SignJWT, jwtVerify } from "jose";

// Short-lived, single-purpose token that authorizes access to /order/pay for
// one specific order — replaces legacy's previlEncode()/previlDecode()
// (lib/lib.Function.php:531-624), a custom two-pass base64 obfuscation with
// no cryptographic integrity, used there to round-trip `direct|my_id|order_num`
// through the PG. A signed JWT with a `purpose` claim can't be forged or
// repurposed as a session token, and rejects tampering instead of silently
// decoding garbage.
export type PaymentTokenPayload = { purpose: "pg_pending"; orderNum: string };

function getSecretKey(secret: string) {
  return new TextEncoder().encode(secret);
}

export async function signPaymentToken(
  payload: PaymentTokenPayload,
  secret: string,
  expiresIn: string = "30m",
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretKey(secret));
}

export async function verifyPaymentToken(token: string, secret: string): Promise<PaymentTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(secret));
    if (payload.purpose === "pg_pending" && typeof payload.orderNum === "string") {
      return payload as unknown as PaymentTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}
