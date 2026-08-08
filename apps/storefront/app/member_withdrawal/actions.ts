"use server";

import { redirect } from "next/navigation";
import { withdrawMember } from "@shoppingmall/core";
import { destroySession, getSession } from "@/lib/auth";

// Port of php/regist_post.php's mode=withdrawal. (prevState, formData)
// signature — see registerAction's comment on why redirect() needs this
// passed directly to useActionState, not wrapped in a client arrow function.
export async function withdrawAction(_prevState: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "먼저 로그인을 하시기 바랍니다." };

  const passwd = String(formData.get("passwd") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const message = String(formData.get("message") ?? "");

  const result = await withdrawMember(session.userId, passwd, reason, message);
  if (!result.ok) return { error: result.error };

  await destroySession();
  redirect("/member_withdrawal_ok");
}
