// Port of lib/lib.Shop.php:79 getCartId(). `cart_id` is a correlation key,
// not an auth token — but unlike legacy (which trusts whatever value is in
// the cookie, even for logged-in members), a logged-in member's cart_id is
// always recomputed here from their session id and the cookie value is
// ignored. That closes the forgery gap where a crafted cart_id cookie could
// otherwise be pointed at another member's base64-encoded id.
export function getOrCreateCartId(memberId: string | null, existingCookie: string | null): string {
  if (memberId) return Buffer.from(memberId).toString("base64");
  return existingCookie || crypto.randomUUID();
}
