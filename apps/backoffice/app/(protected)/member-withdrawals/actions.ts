"use server";

import { revalidatePath } from "next/cache";
import { deleteMemberWithdrawalRecord } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export async function deleteWithdrawalAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await deleteMemberWithdrawalRecord(Number(formData.get("uid")));
  revalidatePath("/member-withdrawals");
}
