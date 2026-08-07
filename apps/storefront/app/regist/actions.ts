"use server";

import { redirect } from "next/navigation";
import { mergeGuestCartOnLogin, registerMember } from "@shoppingmall/core";
import { createSession } from "@/lib/auth";
import { peekGuestCartId } from "@/lib/cart-id";

// Port of php/regist_post.php's mode=new. Welcome mileage/coupon/notification
// side effects are skipped — see registerMember's comment.
//
// Takes (prevState, formData) — useActionState's expected action signature —
// so this can be passed directly as the action without a client-side
// wrapper. A wrapper arrow function breaks redirect(): the thrown
// NEXT_REDIRECT signal needs to cross the server-action RPC boundary
// untouched for the Next.js client runtime to recognize it, and only a
// direct reference to a "use server" function preserves that.
export async function registerAction(_prevState: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const agree1 = formData.get("agree1");
  const agree2 = formData.get("agree2");
  const agree3 = formData.get("agree3");
  if (!agree1 || !agree2 || !agree3) {
    return { error: "필수 동의 항목에 모두 체크해 주세요." };
  }

  const result = await registerMember({
    id: String(formData.get("id") ?? "").trim(),
    password: String(formData.get("passwd") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    tel: String(formData.get("tel") ?? ""),
    cell: String(formData.get("cell") ?? ""),
    address1: String(formData.get("address1") ?? ""),
    address2: String(formData.get("address2") ?? ""),
    postcode: String(formData.get("postcode") ?? ""),
    mailling: formData.get("mailling") === "Y",
    sms: formData.get("sms") === "Y",
  });

  if (!result.ok) return { error: result.error };

  const guestCartId = await peekGuestCartId();
  await createSession({ userId: result.profile.id, role: "member", level: result.profile.level });
  if (guestCartId) await mergeGuestCartOnLogin(guestCartId, result.profile.id);
  redirect("/");
}
