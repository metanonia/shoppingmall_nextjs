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

  try {
    await updateMemberProfile(session.userId, {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    tel: String(formData.get("tel") ?? ""),
    cell: String(formData.get("cell") ?? ""),
    postcode: String(formData.get("postcode") ?? ""),
    address1: String(formData.get("address1") ?? ""),
    address2: String(formData.get("address2") ?? ""),
    birth: String(formData.get("birth") ?? ""),
    birthSl: (["S", "L"].includes(String(formData.get("birthSl"))) ? String(formData.get("birthSl")) : "N") as "N" | "S" | "L",
    gender: (["M", "F"].includes(String(formData.get("gender"))) ? String(formData.get("gender")) : "N") as "N" | "M" | "F",
    marry: (["M", "S"].includes(String(formData.get("marry"))) ? String(formData.get("marry")) : "N") as "N" | "M" | "S",
    hobby: formData.getAll("hobby").map(String).join("|"),
    job: String(formData.get("job") ?? ""),
    comp: String(formData.get("comp") ?? ""),
    compOwner: String(formData.get("compOwner") ?? ""),
    compNum: String(formData.get("compNum") ?? ""),
    compPostcode: String(formData.get("compPostcode") ?? ""),
    compAddress1: String(formData.get("compAddress1") ?? ""),
    compAddress2: String(formData.get("compAddress2") ?? ""),
    compType: String(formData.get("compType") ?? ""),
    compItem: String(formData.get("compItem") ?? ""),
    add: ([1, 2, 3, 4, 5].map((number) => String(formData.get(`add${number}`) ?? "")) as [string, string, string, string, string]),
    mailling: formData.get("mailling") === "Y",
    sms: formData.get("sms") === "Y",
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "회원정보를 변경하지 못했습니다." };
  }

  revalidatePath("/mypage");
  return { success: true };
}
