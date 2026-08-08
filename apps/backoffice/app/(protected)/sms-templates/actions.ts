"use server";

import { revalidatePath } from "next/cache";
import { updateSmsAutoTemplate } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export async function updateSmsAutoTemplateAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await updateSmsAutoTemplate(Number(formData.get("uid")), {
    message1: String(formData.get("message1") ?? ""),
    message2: String(formData.get("message2") ?? ""),
    customerEnabled: formData.get("customerEnabled") === "on",
    adminEnabled: formData.get("adminEnabled") === "on",
  });
  revalidatePath("/sms-templates");
}
