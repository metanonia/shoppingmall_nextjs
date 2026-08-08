"use server";

import { revalidatePath } from "next/cache";
import { processOrderChange } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";

export async function vendorProcessOrderChangeAction(formData: FormData) {
  const session = await requireVendor();
  const status2 = Number(formData.get("status2"));
  if (![2, 3, 4, 9].includes(status2)) return;
  await processOrderChange({ uid: Number(formData.get("uid")), actorId: `판매사:${session.userId}`, vendorId: session.vendorId ?? "", status2: status2 as 2 | 3 | 4 | 9, carrier: String(formData.get("carrier") ?? ""), trackingNumber: String(formData.get("trackingNumber") ?? "") });
  revalidatePath("/vendor/order-changes");
}
