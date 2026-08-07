"use server";

import { changeMemberPassword } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";

// Port of php/regist_post.php's mode=passwd. (prevState, formData) signature
// for direct use as a useActionState action — see registerAction's comment.
export async function changePasswordAction(
  _prevState: { error?: string; success?: boolean },
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const session = await getSession();
  if (!session) return { error: "먼저 로그인을 하시기 바랍니다." };

  const origPasswd = String(formData.get("orig_passwd") ?? "");
  const newPasswd = String(formData.get("passwd") ?? "");
  const newPasswd2 = String(formData.get("passwd2") ?? "");

  if (!origPasswd || !newPasswd) return { error: "필수 정보가 제대로 넘어오지 못했습니다." };
  if (newPasswd !== newPasswd2) return { error: "새 비밀번호가 일치하지 않습니다." };

  const result = await changeMemberPassword(session.userId, origPasswd, newPasswd);
  if (!result.ok) return { error: result.error };
  return { success: true };
}
