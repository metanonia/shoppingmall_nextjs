"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPost } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";

export type VendorBoardState = { error?: string };

export async function createVendorCounselAction(
  _previous: VendorBoardState,
  formData: FormData,
): Promise<VendorBoardState> {
  const session = await requireVendor();
  const vendorId = session.vendorId ?? session.userId;
  const result = await createPost("vcounsel", { memberId: vendorId, memberName: vendorId }, {
    subject: String(formData.get("subject") ?? "").trim(),
    content: String(formData.get("content") ?? "").trim(),
  });
  if (!result.ok) return { error: result.error };
  revalidatePath("/vendor/board/vcounsel");
  redirect(`/vendor/board/vcounsel/${result.uid}`);
}
