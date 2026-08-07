"use server";

import { redirect } from "next/navigation";
import { authenticateMember } from "@shoppingmall/core";
import { createSession } from "@/lib/auth";

// Port of php/login_post.php's core flow (cart_id merge / recent-view
// migration on login are skipped — no cart_id cookie infra yet, see
// MIGRATION.md).
//
// (prevState, formData) signature — see registerAction's comment on why
// this can't be wrapped in a client-side arrow function.
export async function loginAction(_prevState: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const id = String(formData.get("id") ?? "").trim();
  const password = String(formData.get("passwd") ?? "");
  const redirectTo = String(formData.get("redirect_to") ?? "/");

  if (!id || !password) return { error: "아이디와 비밀번호를 입력하세요." };

  const result = await authenticateMember(id, password);
  if (!result.ok) return { error: result.error };

  await createSession({ userId: result.profile.id, role: "member", level: result.profile.level });
  redirect(redirectTo);
}
