"use server";

import { revalidatePath } from "next/cache";
import { deleteReview, setReviewBest } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export async function setReviewBestAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await setReviewBest(Number(formData.get("uid")), formData.get("best") === "1");
  revalidatePath("/reviews");
}

export async function deleteReviewAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await deleteReview(Number(formData.get("uid")));
  revalidatePath("/reviews");
}
