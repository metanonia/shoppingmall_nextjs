"use server";

import { revalidatePath } from "next/cache";
import { updateMemberProfile } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";

// Port of php/regist_post.php's mode=modify. (prevState, formData) signature
// for direct use as a useActionState action — see registerAction's comment.
export async function updateProfileAction(
  _prevState: { error?: string; success?: boolean },
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const session = await getSession();
  if (!session) return { error: "먼저 로그인을 하시기 바랍니다." };

  await updateMemberProfile(session.userId, {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    tel: String(formData.get("tel") ?? ""),
    cell: String(formData.get("cell") ?? ""),
    postcode: String(formData.get("postcode") ?? ""),
    address1: String(formData.get("address1") ?? ""),
    address2: String(formData.get("address2") ?? ""),
    mailling: formData.get("mailling") === "Y",
    sms: formData.get("sms") === "Y",
  });

  revalidatePath("/mypage");
  return { success: true };
}
