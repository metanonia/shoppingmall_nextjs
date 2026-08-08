"use server";

import { revalidatePath } from "next/cache";
import { markDbErrorLogProcessed } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export async function markDbErrorLogProcessedAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const uid = Number(formData.get("uid"));
  await markDbErrorLogProcessed(uid);
  revalidatePath("/db-error-log");
}
