"use server";

import { revalidatePath } from "next/cache";
import { toggleFavoriteStore } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";

// Port of php/favorite_store_json.php's toggle — see goods/[uid]/actions.ts's
// toggleFavoriteGoodsAction for the same pattern applied to products.
export async function toggleFavoriteStoreAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const vendor = String(formData.get("vendor") ?? "");
  await toggleFavoriteStore(session.userId, vendor);
  revalidatePath(`/store?vendor=${vendor}`);
}
