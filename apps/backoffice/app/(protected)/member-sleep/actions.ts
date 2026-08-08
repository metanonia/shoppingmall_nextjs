"use server";

import { revalidatePath } from "next/cache";
import { restoreDormantMember } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export async function restoreDormantMemberAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await restoreDormantMember(Number(formData.get("uid")));
  revalidatePath("/member-sleep");
  revalidatePath("/members");
}
