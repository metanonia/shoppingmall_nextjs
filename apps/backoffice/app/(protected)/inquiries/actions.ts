"use server";

import { revalidatePath } from "next/cache";
import { answerInquiry, deleteInquiry } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export async function answerInquiryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const uid = Number(formData.get("uid"));
  const answer = String(formData.get("answer") ?? "");
  await answerInquiry(uid, answer);
  revalidatePath("/inquiries");
}

export async function deleteInquiryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await deleteInquiry(Number(formData.get("uid")));
  revalidatePath("/inquiries");
}
