"use server";

import { revalidatePath } from "next/cache";
import { createInquiry, getMemberProfile, issueCoupon, recordGoodsView, setInquiryFiles, toggleFavoriteGoods, toggleFavoriteStore, unlockGuestInquiry } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";
import { ensureCartId } from "@/lib/cart-id";
import { getDevice } from "@/lib/request";
import { saveInquiryFiles } from "@/lib/inquiry-upload";

export async function recordGoodsViewAction(goodsUid: number, vendor: string): Promise<void> {
  const session = await getSession();
  const [checkId, device] = await Promise.all([ensureCartId(session?.userId ?? null), getDevice()]);
  await recordGoodsView(checkId, goodsUid, vendor, device === "mobile");
}

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

export async function createInquiryAction(_prevState: InquiryFormState, formData: FormData): Promise<InquiryFormState> {
  const session = await getSession();

  const goodsUid = Number(formData.get("goodsUid"));
  const subject = String(formData.get("subject") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const secret = formData.get("secret") === "on";
  const category = Number(formData.get("category") ?? 0);

  let author;
  if (session) {
    const profile = await getMemberProfile(session.userId);
    if (!profile) return { error: "회원 정보를 확인할 수 없습니다." };
    author = { memberId: session.userId, memberName: profile.name };
  } else {
    author = {
      guestName: String(formData.get("name") ?? ""),
      guestPasswordPlain: String(formData.get("password") ?? ""),
    };
    if (formData.get("agreement") !== "on") return { error: "개인정보 수집 및 이용에 동의해 주세요." };
  }

  const result = await createInquiry(author, { goodsUid, subject, content, secret, category });
  if (!result.ok) return { error: result.error };
  const files = formData.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
  if (files.length > 0) {
    const saved = await saveInquiryFiles(result.uid, files);
    if (!saved.ok) return { error: saved.error };
    await setInquiryFiles(result.uid, saved.filenames);
  }

  revalidatePath(`/goods/${goodsUid}`);
  return { success: true };
}

export type UnlockInquiryFormState = { error?: string; content?: string; answer?: string | null; files?: string[] };

export async function unlockInquiryAction(
  _prevState: UnlockInquiryFormState,
  formData: FormData,
): Promise<UnlockInquiryFormState> {
  const result = await unlockGuestInquiry(Number(formData.get("uid")), String(formData.get("password") ?? ""));
  return result.ok ? { content: result.content, answer: result.answer, files: result.files } : { error: result.error };
}

export type DownloadCouponFormState = { error?: string; success?: boolean };

// Port of the coupon_manager type=4 ("상품상세페이지 다운로드") trigger —
// the only coupon-issuance path Phase 4 wires up, see coupon.ts.
export async function downloadCouponAction(
  _prevState: DownloadCouponFormState,
  formData: FormData,
): Promise<DownloadCouponFormState> {
  const session = await getSession();
  if (!session) return { error: "로그인이 필요합니다." };

  const couponManagerUid = Number(formData.get("couponManagerUid"));
  const goodsUid = Number(formData.get("goodsUid"));
  const result = await issueCoupon(session.userId, couponManagerUid, goodsUid);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/goods/${goodsUid}`);
  return { success: true };
}
