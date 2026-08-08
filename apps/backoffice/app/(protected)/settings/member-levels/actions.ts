"use server";

import { revalidatePath } from "next/cache";
import { createMemberLevel, deleteMemberLevel, recalculateMemberLevels, updateMemberLevel } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export type ActionState = { error?: string; success?: boolean };

function levelInput(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    discount: Number(formData.get("discount") ?? 0) || 0,
    mileage: Number(formData.get("mileage") ?? 0) || 0,
    deliveryFree: formData.get("deliveryFree") === "on",
    price: Number(formData.get("price") ?? 0) || 0,
    couponUid: Number(formData.get("couponUid") ?? 0) || 0,
  };
}

export async function createMemberLevelAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await createMemberLevel(levelInput(formData));
  if (!result.ok) return { error: result.error };
  revalidatePath("/settings/member-levels");
  return { success: true };
}

export async function updateMemberLevelAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const uid = Number(formData.get("uid"));
  const result = await updateMemberLevel(uid, levelInput(formData));
  if (!result.ok) return { error: result.error };
  revalidatePath("/settings/member-levels");
  return { success: true };
}

export async function deleteMemberLevelAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const uid = Number(formData.get("uid"));
  await deleteMemberLevel(uid);
  revalidatePath("/settings/member-levels");
}

export type RecalculateState = { error?: string; result?: { evaluatedCount: number; changedCount: number; couponsIssued: number } };

export async function recalculateMemberLevelsAction(_prevState: RecalculateState, formData: FormData): Promise<RecalculateState> {
  await requireAdmin();
  const dateFrom = String(formData.get("dateFrom") ?? "");
  const dateTo = String(formData.get("dateTo") ?? "");
  if (!dateFrom || !dateTo) return { error: "기간을 입력해 주세요." };

  const result = await recalculateMemberLevels(dateFrom, dateTo);
  revalidatePath("/settings/member-levels");
  return { result: { evaluatedCount: result.evaluatedCount, changedCount: result.changedCount, couponsIssued: result.couponsIssued } };
}
