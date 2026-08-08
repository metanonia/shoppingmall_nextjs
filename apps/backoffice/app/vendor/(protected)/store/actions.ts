"use server";

import { revalidatePath } from "next/cache";
import { updateVendorConfiguration } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";

export type ActionState = { error?: string; success?: boolean };

export async function updateVendorConfigurationAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireVendor();

  const result = await updateVendorConfiguration(session.vendorId ?? "", {
    csTime1: String(formData.get("csTime1") ?? ""),
    csTime2: String(formData.get("csTime2") ?? ""),
    csTime3: String(formData.get("csTime3") ?? ""),
    csTime4: String(formData.get("csTime4") ?? ""),
    rtnPostcode: String(formData.get("rtnPostcode") ?? ""),
    rtnAddress1: String(formData.get("rtnAddress1") ?? ""),
    rtnAddress2: String(formData.get("rtnAddress2") ?? ""),
    deliveryInfo: String(formData.get("deliveryInfo") ?? ""),
    refundInfo: String(formData.get("refundInfo") ?? ""),
    exchangeInfo: String(formData.get("exchangeInfo") ?? ""),
    asInfo: String(formData.get("asInfo") ?? ""),
    displayBest: Number(formData.get("displayBest") ?? 0) || 0,
    displayReco: Number(formData.get("displayReco") ?? 0) || 0,
    displayNew: Number(formData.get("displayNew") ?? 0) || 0,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/vendor/store");
  return { success: true };
}
