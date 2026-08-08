"use server";

import { revalidatePath } from "next/cache";
import { answerVendorInquiry } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";

export type VendorInquiryState = { error?: string; success?: boolean };

export async function answerVendorInquiryAction(_previous: VendorInquiryState, formData: FormData): Promise<VendorInquiryState> {
  const session = await requireVendor();
  const result = await answerVendorInquiry(session.vendorId ?? session.userId, Number(formData.get("uid")), String(formData.get("answer") ?? ""));
  if (!result.ok) return { error: result.error };
  revalidatePath("/vendor/inquiries");
  return { success: true };
}
