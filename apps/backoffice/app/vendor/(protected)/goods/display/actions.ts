"use server";

import { revalidatePath } from "next/cache";
import { addGoodsToDisplay, reorderDisplayGoods, removeGoodsFromDisplay, type DisplaySubSlot } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";
import type { ActionState } from "@/app/(protected)/goods/display/actions";

// Vendor twin of app/(protected)/goods/display/actions.ts, fixed to
// slot="store" and always scoped to the caller's own vendorId (never a
// client-submitted value) — the core functions already accept vendorId for
// exactly this ownership check.
function parseSub(formData: FormData): DisplaySubSlot {
  const subRaw = Number(formData.get("sub"));
  return (subRaw === 2 || subRaw === 3 ? subRaw : 1) as DisplaySubSlot;
}

export async function addGoodsToDisplayAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireVendor();
  const sub = parseSub(formData);
  const goodsUid = Number(formData.get("goodsUid"));
  const result = await addGoodsToDisplay("store", sub, goodsUid, session.vendorId ?? "");
  if (!result.ok) return { error: result.error };
  revalidatePath("/vendor/goods/display");
  return {};
}

export async function removeGoodsFromDisplayAction(formData: FormData): Promise<void> {
  const session = await requireVendor();
  const sub = parseSub(formData);
  const goodsUid = Number(formData.get("goodsUid"));
  await removeGoodsFromDisplay("store", sub, goodsUid, session.vendorId ?? "");
  revalidatePath("/vendor/goods/display");
}

export async function reorderDisplayGoodsAction(formData: FormData): Promise<void> {
  const session = await requireVendor();
  const sub = parseSub(formData);
  const uids = formData.getAll("uid").map(Number).filter(Number.isInteger);
  await reorderDisplayGoods("store", sub, uids, session.vendorId ?? "");
  revalidatePath("/vendor/goods/display");
}
