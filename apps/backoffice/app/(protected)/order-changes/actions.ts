"use server";

import { revalidatePath } from "next/cache";
import { processOrderChange } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export async function processOrderChangeAction(formData: FormData) {
  const session = await requireAdmin();
  const status2 = Number(formData.get("status2"));
  if (![2, 3, 4, 9].includes(status2)) return;
  await processOrderChange({ uid: Number(formData.get("uid")), actorId: session.userId, status2: status2 as 2 | 3 | 4 | 9, carrier: String(formData.get("carrier") ?? ""), trackingNumber: String(formData.get("trackingNumber") ?? "") });
  revalidatePath("/order-changes");
}
