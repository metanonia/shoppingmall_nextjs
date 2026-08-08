"use server";

import { redirect } from "next/navigation";
import { authenticateVendor } from "@shoppingmall/core";
import { createSession, destroySession } from "@/lib/auth";

export type ActionState = { error?: string };

export async function vendorLoginAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const password = String(formData.get("passwd") ?? "");

  if (!id || !password) return { error: "아이디와 비밀번호를 입력하세요." };

  const result = await authenticateVendor(id, password);
  if (!result.ok) return { error: result.error };

  await createSession({ userId: result.profile.id, role: "vendor", level: 0, vendorId: result.profile.id });
  redirect("/vendor/dashboard");
}

export async function vendorLogoutAction(): Promise<void> {
  await destroySession();
  redirect("/vendor");
}
