"use server";

import { redirect } from "next/navigation";
import { createCouponManager, updateCouponManager, type CouponManagerInput } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export type ActionState = { error?: string };

function parseInput(formData: FormData): CouponManagerInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    discount: Number(formData.get("discount") ?? 0) || 0,
    discountType: formData.get("discountType") === "W" ? "W" : "P",
    discountLimit: Number(formData.get("discountLimit") ?? 0) || 0,
    useSDate: String(formData.get("useSDate") ?? ""),
    useEDate: String(formData.get("useEDate") ?? ""),
    useDay: Number(formData.get("useDay") ?? 0) || 0,
    useType: Number(formData.get("useType") ?? 0) || 0,
    useLimit: Number(formData.get("useLimit") ?? 0) || 0,
  };
}

export async function createCouponManagerAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await createCouponManager(parseInput(formData));
  if (!result.ok) return { error: result.error };
  redirect("/coupons");
}

export async function updateCouponManagerAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const uid = Number(formData.get("uid"));
  const result = await updateCouponManager(uid, parseInput(formData));
  if (!result.ok) return { error: result.error };
  redirect("/coupons");
}
