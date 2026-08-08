"use server";

import { revalidatePath } from "next/cache";
import { deleteMileageEntry, restoreMileageEntry } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";
import { getClientIp } from "@/lib/request-ip";

export async function deleteMileageEntryAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const uid = Number(formData.get("uid"));
  await deleteMileageEntry(uid, session.userId, await getClientIp());
  revalidatePath("/mileage-log");
}

export async function restoreMileageEntryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const uid = Number(formData.get("uid"));
  await restoreMileageEntry(uid);
  revalidatePath("/mileage-log");
}
