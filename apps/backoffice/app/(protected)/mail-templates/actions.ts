"use server";

import { revalidatePath } from "next/cache";
import { updateAutoMailTemplate } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export type ActionState = { error?: string; success?: boolean };

export async function updateAutoMailTemplateAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const type = String(formData.get("type") ?? "");
  await updateAutoMailTemplate(type, {
    enabled: formData.get("enabled") === "on",
    used: formData.get("used") === "on",
    subject: String(formData.get("subject") ?? "").trim(),
    content: String(formData.get("content") ?? ""),
  });
  revalidatePath("/mail-templates");
  return { success: true };
}
