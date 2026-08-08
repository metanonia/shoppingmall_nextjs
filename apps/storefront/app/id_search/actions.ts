"use server";

import { findMemberId } from "@shoppingmall/core";

export type FindIdState = { maskedId?: string; error?: string };

export async function findMemberIdAction(_prevState: FindIdState, formData: FormData): Promise<FindIdState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!name || !email) return { error: "이름과 이메일을 입력해 주세요." };

  const result = await findMemberId(name, email);
  if (!result.ok) return { error: result.error };
  return { maskedId: result.maskedId };
}
