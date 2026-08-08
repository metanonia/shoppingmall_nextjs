"use server";

import { revalidatePath } from "next/cache";
import { bulkUpdateGoodsPricing, bulkUpdateOrderPriority } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";
import type { ActionState } from "@/app/(protected)/goods/bulk-edit/actions";

// Vendor twin of app/(protected)/goods/bulk-edit/actions.ts — both core
// functions already take an optional vendorId scope, so ownership
// enforcement is just always passing the caller's own session id (never a
// client-submitted value) rather than a separate check per row.
export async function bulkUpdateVendorGoodsPricingAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireVendor();
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

  const result = await bulkUpdateGoodsPricing(rows, session.vendorId ?? "");
  if (!result.ok) return { error: result.error };
  revalidatePath("/vendor/goods/bulk-edit");
  return { success: true };
}

export async function bulkUpdateVendorOrderPriorityAction(formData: FormData): Promise<void> {
  const session = await requireVendor();
  const uids = formData.getAll("uid").map(Number).filter(Number.isInteger);
  const priority = Number(formData.get("priority") ?? 5) || 5;
  await bulkUpdateOrderPriority(uids, priority, session.vendorId ?? "");
  revalidatePath("/vendor/goods/bulk-edit");
}
