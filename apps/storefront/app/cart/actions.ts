"use server";

import { revalidatePath } from "next/cache";
import { addToCart, removeCartItem, toggleCartSelect, updateCartQty } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";
import { ensureCartId } from "@/lib/cart-id";

export type AddToCartFormState = { error?: string; success?: boolean };

// Port of php/goods_cart_json.php. Guests are allowed (see cart.ts's note),
// so this doesn't gate on getSession() the way favorite/inquiry actions do.
export async function addToCartAction(
  _prevState: AddToCartFormState,
  formData: FormData,
): Promise<AddToCartFormState> {
  const session = await getSession();
  const cartId = await ensureCartId(session?.userId ?? null);

  const goodsUid = Number(formData.get("goodsUid"));
  const optionUid = Number(formData.get("optionUid") ?? 0);
  const qty = Number(formData.get("qty") ?? 1);
  const direct = formData.get("direct") === "1";

  const result = await addToCart(cartId, session?.userId ?? null, { goodsUid, optionUid, qty, direct });
  if (!result.ok) return { error: result.error };

  revalidatePath("/cart");
  return { success: true };
}

export async function updateCartQtyAction(formData: FormData): Promise<void> {
  const session = await getSession();
  const cartId = await ensureCartId(session?.userId ?? null);
  const cartUid = Number(formData.get("cartUid"));
  const qty = Number(formData.get("qty"));
  await updateCartQty(cartId, cartUid, qty);
  revalidatePath("/cart");
}

export async function removeCartItemAction(formData: FormData): Promise<void> {
  const session = await getSession();
  const cartId = await ensureCartId(session?.userId ?? null);
  const cartUid = Number(formData.get("cartUid"));
  await removeCartItem(cartId, cartUid);
  revalidatePath("/cart");
}

export async function toggleCartSelectAction(formData: FormData): Promise<void> {
  const session = await getSession();
  const cartId = await ensureCartId(session?.userId ?? null);
  const cartUid = Number(formData.get("cartUid"));
  const selected = formData.get("selected") === "1";
  await toggleCartSelect(cartId, cartUid, selected);
  revalidatePath("/cart");
}
