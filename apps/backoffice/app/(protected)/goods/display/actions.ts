"use server";

import { revalidatePath } from "next/cache";
import { addGoodsToDisplay, reorderDisplayGoods, removeGoodsFromDisplay, type DisplaySlot, type DisplaySubSlot } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export type ActionState = { error?: string };

function parseSlot(formData: FormData): { slot: DisplaySlot; sub: DisplaySubSlot } {
  const slot = formData.get("slot") === "main2" ? "main2" : "main1";
  const subRaw = Number(formData.get("sub"));
  const sub = (subRaw === 2 || subRaw === 3 ? subRaw : 1) as DisplaySubSlot;
  return { slot, sub };
}

export async function addGoodsToDisplayAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const { slot, sub } = parseSlot(formData);
  const goodsUid = Number(formData.get("goodsUid"));
  const result = await addGoodsToDisplay(slot, sub, goodsUid);
  if (!result.ok) return { error: result.error };
  revalidatePath("/goods/display");
  return {};
}

export async function removeGoodsFromDisplayAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const { slot, sub } = parseSlot(formData);
  const goodsUid = Number(formData.get("goodsUid"));
  await removeGoodsFromDisplay(slot, sub, goodsUid);
  revalidatePath("/goods/display");
}

export async function reorderDisplayGoodsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const { slot, sub } = parseSlot(formData);
  const uids = formData.getAll("uid").map(Number).filter(Number.isInteger);
  await reorderDisplayGoods(slot, sub, uids);
  revalidatePath("/goods/display");
}
