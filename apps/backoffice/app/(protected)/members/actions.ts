"use server";

import { revalidatePath } from "next/cache";
import { adjustMileage, changeMemberLevel, getShopConfig, issueCouponToMembers } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export type ActionState = { error?: string };

export async function changeMemberLevelAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const memberIds = formData.getAll("memberId").map(String);
  const newLevel = Number(formData.get("newLevel"));

  const result = await changeMemberLevel(memberIds, newLevel, session.level);
  if (!result.ok) return { error: result.error };

  revalidatePath("/members");
  return {};
}

export async function issueCouponAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const memberId = String(formData.get("memberId") ?? "");
  const couponManagerUid = Number(formData.get("couponManagerUid"));

  const result = await issueCouponToMembers([memberId], couponManagerUid);
  if (!result.ok) return { error: result.error };
  if (result.issuedCount === 0) return { error: "이미 발급된 쿠폰이거나 발급 조건에 맞지 않습니다." };

  revalidatePath(`/members/${memberId}`);
  return {};
}

export async function adjustMileageAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const memberId = String(formData.get("memberId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const reason = String(formData.get("reason") ?? "");

  const config = await getShopConfig();
  const result = await adjustMileage({ memberId, amount, reason, actorId: session.userId }, config);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/members/${memberId}`);
  return {};
}
