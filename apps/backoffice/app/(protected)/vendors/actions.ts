"use server";

import { revalidatePath } from "next/cache";
import { updateVendorAuth } from "@shoppingmall/core";

export async function updateVendorAuthAction(formData: FormData): Promise<void> {
  const vendorUid = Number(formData.get("vendorUid"));
  const auth = String(formData.get("auth") ?? "R") as "R" | "Y" | "N";
  await updateVendorAuth(vendorUid, auth);
  revalidatePath("/vendors");
}
