import { cookies } from "next/headers";
import { getOrCreateCartId } from "@shoppingmall/core";

// Next.js-specific half of cart_id (cookies() access) — packages/core stays
// framework-agnostic, same split as lib/auth.ts. A cart_id cookie is only
// ever needed for guests: a logged-in member's cart_id is recomputed from
// their session id on every call, so no cookie read/write happens for them.
const CART_ID_COOKIE = "cartId";

// Read-only variant for Server Components rendering existing cart state.
// Never writes — Next.js only allows cookies().set() from Server Actions /
// Route Handlers. A guest with no cookie yet gets a throwaway id back
// (harmless: their cart is empty either way).
export async function getCartId(memberId: string | null): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_ID_COOKIE)?.value ?? null;
  return getOrCreateCartId(memberId, existing);
}

// Raw cookie peek, used by the login action to find the guest cart to merge
// — deliberately bypasses getOrCreateCartId so a member with no prior guest
// cart doesn't get a pointless empty-merge call.
export async function peekGuestCartId(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_ID_COOKIE)?.value ?? null;
}

// Write-capable variant for Server Actions that mutate the cart (add/update/
// remove). Persists a freshly generated guest id so it survives future
// requests; a no-op for members (nothing to persist).
export async function ensureCartId(memberId: string | null): Promise<string> {
  const store = await cookies();
  const existing = store.get(CART_ID_COOKIE)?.value ?? null;
  const cartId = getOrCreateCartId(memberId, existing);
  if (!memberId && cartId !== existing) {
    store.set(CART_ID_COOKIE, cartId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return cartId;
}
