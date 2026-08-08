"use server";

import { redirect } from "next/navigation";
import { authenticateMember } from "@shoppingmall/core";
import { createSession } from "@/lib/auth";

// Admin login reuses the same authenticateMember() the storefront uses for
// member login (port of php/login_post.php) rather than a separate admin
// credential path — legacy also shares mallRN_member across both, gating
// purely on level (managers/common/ad_init.php: `$my_level < 99` redirect).
const ADMIN_LEVEL_THRESHOLD = 99;

export async function loginAction(_prevState: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const id = String(formData.get("id") ?? "").trim();
  const password = String(formData.get("passwd") ?? "");

  if (!id || !password) return { error: "아이디와 비밀번호를 입력하세요." };

  const result = await authenticateMember(id, password);
  if (!result.ok) return { error: result.error };

  if (result.profile.level < ADMIN_LEVEL_THRESHOLD) {
    return { error: "관리자 권한이 없는 계정입니다." };
  }

  await createSession({ userId: result.profile.id, role: "admin", level: result.profile.level });
  redirect("/");
}
