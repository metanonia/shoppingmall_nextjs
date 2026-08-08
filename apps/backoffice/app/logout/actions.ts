"use server";

import { redirect } from "next/navigation";
import { recordAccessLog } from "@shoppingmall/core";
import { destroySession, getSession } from "@/lib/auth";
import { getClientIp } from "@/lib/request-ip";

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  if (session) await recordAccessLog("ADMIN", session.userId, 1, "로그아웃", await getClientIp());
  await destroySession();
  redirect("/login");
}
