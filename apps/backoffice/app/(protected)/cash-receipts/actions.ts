"use server";

import { revalidatePath } from "next/cache";
import { deleteCashReceipt, updateCashReceiptStatus } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export async function updateCashReceiptAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const raw = Number(formData.get("status"));
  if (![1, 2, 3, 4].includes(raw)) return;
  await updateCashReceiptStatus(Number(formData.get("uid")), raw as 1 | 2 | 3 | 4, String(formData.get("info") ?? ""));
  revalidatePath("/cash-receipts");
}

export async function deleteCashReceiptAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await deleteCashReceipt(Number(formData.get("uid")));
  revalidatePath("/cash-receipts");
}
