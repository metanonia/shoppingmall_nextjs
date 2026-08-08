"use server";

import { revalidatePath } from "next/cache";
import { markOrderCancelCpLogProcessed } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export async function markOrderCancelCpLogProcessedAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const uid = Number(formData.get("uid"));
  await markOrderCancelCpLogProcessed(uid);
  revalidatePath("/order-cancel-log");
}
