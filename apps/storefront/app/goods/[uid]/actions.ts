"use server";

import { revalidatePath } from "next/cache";
import { createInquiry, getMemberProfile, toggleFavoriteGoods, toggleFavoriteStore } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";

// Port of php/favorite_goods_json.php's toggle, member-only like legacy
// (favorite_goods_json.php:16 rejects `!$my_id` outright) — the button
// itself is only rendered for a logged-in member, this is just defense in
// depth against a direct POST.
export async function toggleFavoriteGoodsAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const goodsUid = Number(formData.get("goodsUid"));
  const vendor = String(formData.get("vendor") ?? "");
  await toggleFavoriteGoods(session.userId, goodsUid, vendor);
  revalidatePath(`/goods/${goodsUid}`);
}

export async function toggleFavoriteStoreAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;

  const vendor = String(formData.get("vendor") ?? "");
  const goodsUid = String(formData.get("goodsUid") ?? "");
  await toggleFavoriteStore(session.userId, vendor);
  revalidatePath(`/goods/${goodsUid}`);
}

export type InquiryFormState = { error?: string; success?: boolean };

// Port of php/inquiry_post.php, member-only path — see inquiry.ts's note on
// why the guest+password path isn't implemented here.
export async function createInquiryAction(_prevState: InquiryFormState, formData: FormData): Promise<InquiryFormState> {
  const session = await getSession();
  if (!session) return { error: "로그인이 필요합니다." };

  const goodsUid = Number(formData.get("goodsUid"));
  const subject = String(formData.get("subject") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const secret = formData.get("secret") === "on";

  const profile = await getMemberProfile(session.userId);
  if (!profile) return { error: "회원 정보를 확인할 수 없습니다." };

  const result = await createInquiry(session.userId, profile.name, { goodsUid, subject, content, secret });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/goods/${goodsUid}`);
  return { success: true };
}
