"use server";

import { revalidatePath } from "next/cache";
import { cancelOrder, cancelOrderChangeRequest, createReview, getMemberProfile, requestOrderChange, setReviewFiles } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";
import { saveReviewFiles } from "@/lib/review-upload";

export type CancelOrderFormState = { error?: string; success?: boolean };
export type OrderChangeFormState = { error?: string; success?: boolean };

export async function requestOrderChangeAction(_prevState: OrderChangeFormState, formData: FormData): Promise<OrderChangeFormState> {
  const session = await getSession();
  if (!session) return { error: "로그인이 필요합니다." };
  const orderNum = String(formData.get("orderNum") ?? "");
  const type = Number(formData.get("type"));
  if (type !== 7 && type !== 8 && type !== 9) return { error: "요청 종류를 확인해주세요." };
  const result = await requestOrderChange({ orderNum, ogUid: Number(formData.get("ogUid")), memberId: session.userId, type, reason: String(formData.get("reason") ?? ""), message: String(formData.get("message") ?? ""), bankInfo: String(formData.get("bankInfo") ?? "") });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/my_order/${orderNum}`);
  return { success: true };
}

export async function cancelOrderChangeAction(_prevState: OrderChangeFormState, formData: FormData): Promise<OrderChangeFormState> {
  const session = await getSession();
  if (!session) return { error: "로그인이 필요합니다." };
  const result = await cancelOrderChangeRequest(Number(formData.get("uid")), session.userId);
  if (!result.ok) return { error: result.error };
  revalidatePath("/my_order", "layout");
  return { success: true };
}

// Port of php/order_status_post.php's status9/status95 cases, member path.
// Guest cancellation goes through the same cancelOrder() core function but
// is invoked from /my_order/guest/actions.ts with password auth instead.
export async function cancelOrderAction(
  _prevState: CancelOrderFormState,
  formData: FormData,
): Promise<CancelOrderFormState> {
  const session = await getSession();
  if (!session) return { error: "로그인이 필요합니다." };

  const orderNum = String(formData.get("orderNum") ?? "");
  const result = await cancelOrder(orderNum, { memberId: session.userId });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/my_order/${orderNum}`);
  revalidatePath("/my_order");
  return { success: true };
}

export type ReviewFormState = { error?: string; success?: boolean };

export async function createReviewAction(
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const session = await getSession();
  if (!session) return { error: "로그인이 필요합니다." };
  const profile = await getMemberProfile(session.userId);
  if (!profile) return { error: "회원 정보를 확인할 수 없습니다." };

  const orderGoodsUid = Number(formData.get("orderGoodsUid"));
  const stars = Number(formData.get("stars"));
  const content = String(formData.get("content") ?? "");
  const result = await createReview(session.userId, profile.name, { orderGoodsUid, stars, content });
  if (!result.ok) return { error: result.error };
  const files = formData.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
  if (files.length > 0) {
    const saved = await saveReviewFiles(result.uid, files);
    if (!saved.ok) return { error: saved.error };
    await setReviewFiles(result.uid, saved.filenames);
  }

  const orderNum = String(formData.get("orderNum") ?? "");
  revalidatePath(`/my_order/${orderNum}`);
  revalidatePath(`/goods/${String(formData.get("goodsUid") ?? "")}`);
  revalidatePath("/review");
  revalidatePath("/my_review");
  return { success: true };
}
