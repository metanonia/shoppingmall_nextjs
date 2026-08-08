"use server";

import { redirect } from "next/navigation";
import { authenticateVendor, recordAccessLog } from "@shoppingmall/core";
import { createSession, destroySession, getSession } from "@/lib/auth";
import { getClientIp } from "@/lib/request-ip";

export type ActionState = { error?: string };

export async function vendorLoginAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const password = String(formData.get("passwd") ?? "");

  if (!id || !password) return { error: "아이디와 비밀번호를 입력하세요." };

  const result = await authenticateVendor(id, password);
  if (!result.ok) return { error: result.error };

  await createSession({ userId: result.profile.id, role: "vendor", level: 0, vendorId: result.profile.id });
  await recordAccessLog("VENDOR", result.profile.id, 0, `${result.profile.compName} 로그인`, await getClientIp());
  redirect("/vendor/dashboard");
}

export async function vendorLogoutAction(): Promise<void> {
  const session = await getSession();
  if (session?.vendorId) await recordAccessLog("VENDOR", session.vendorId, 1, "로그아웃", await getClientIp());
  await destroySession();
  redirect("/vendor");
}
