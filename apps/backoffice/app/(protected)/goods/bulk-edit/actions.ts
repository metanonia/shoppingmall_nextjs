"use server";

import { revalidatePath } from "next/cache";
import { bulkUpdateGoodsPricing, bulkUpdateOrderPriority } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export type ActionState = { error?: string; success?: boolean };

export async function bulkUpdateGoodsPricingAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const uids = formData.getAll("uid").map(Number);

  const rows = uids.map((uid) => ({
    uid,
    price: Number(formData.get(`price_${uid}`) ?? 0) || 0,
    origPrice: Number(formData.get(`origPrice_${uid}`) ?? 0) || 0,
    consumerPrice: Number(formData.get(`consumerPrice_${uid}`) ?? 0) || 0,
    commissionType: Number(formData.get(`commissionType_${uid}`) ?? 0) || 0,
    commission: Number(formData.get(`commission_${uid}`) ?? 0) || 0,
    qtyType: Number(formData.get(`qtyType_${uid}`) ?? 0) || 0,
    qty: Number(formData.get(`qty_${uid}`) ?? 0) || 0,
  }));

  const result = await bulkUpdateGoodsPricing(rows);
  if (!result.ok) return { error: result.error };
  revalidatePath("/goods/bulk-edit");
  return { success: true };
}

export async function bulkUpdateOrderPriorityAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const uids = formData.getAll("uid").map(Number).filter(Number.isInteger);
  const priority = Number(formData.get("priority") ?? 5) || 5;
  await bulkUpdateOrderPriority(uids, priority);
  revalidatePath("/goods/bulk-edit");
}
