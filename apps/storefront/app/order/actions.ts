"use server";

import { redirect } from "next/navigation";
import { createOrder, getActiveEventDiscounts, priceLimitConfigFrom } from "@shoppingmall/core";
import { hashPassword } from "@shoppingmall/auth";
import { getSession } from "@/lib/auth";
import { ensureCartId } from "@/lib/cart-id";
import { getCachedMemberDiscountPct, getCachedShopConfig, getDevice } from "@/lib/request";

export type SubmitOrderFormState = { error?: string };

// Port of php/order_post.php. useActionState's expected (prevState, formData)
// signature, passed directly — see MIGRATION.md on why a client-side wrapper
// breaks redirect()'s NEXT_REDIRECT signal.
export async function submitOrderAction(
  _prevState: SubmitOrderFormState,
  formData: FormData,
): Promise<SubmitOrderFormState> {
  const session = await getSession();
  const cartId = await ensureCartId(session?.userId ?? null);

  const [config, memberDiscountPct, device, eventDiscounts] = await Promise.all([
    getCachedShopConfig(),
    getCachedMemberDiscountPct(),
    getDevice(),
    getActiveEventDiscounts(),
  ]);
  const priceLimitConfig = priceLimitConfigFrom(config);

  const direct = formData.get("direct") === "1";
  const payType = String(formData.get("payType") ?? "B") === "M" ? "M" : "B";
  const couponUidRaw = Number(formData.get("couponUid") ?? 0);
  const couponUid = couponUidRaw > 0 ? couponUidRaw : null;
  const useMileageAmount = Math.max(0, Number(formData.get("useMileage") ?? 0));
  const clientPayTotal = Math.max(0, Number(formData.get("clientPayTotal") ?? 0));

  const name = String(formData.get("name") ?? "").trim();
  const cell = String(formData.get("cell") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const name2 = String(formData.get("name2") ?? "").trim() || name;
  const cell2 = String(formData.get("cell2") ?? "").trim() || cell;
  const postcode = String(formData.get("postcode") ?? "").trim();
  const address1 = String(formData.get("address1") ?? "").trim();
  const address2 = String(formData.get("address2") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !cell || !address1) return { error: "주문자 정보와 배송지를 입력해주세요." };

  let guestPasswordHash: string | undefined;
  if (!session) {
    const guestPasswd = String(formData.get("guestPasswd") ?? "");
    if (guestPasswd.length < 4) return { error: "주문조회용 비밀번호를 4자 이상 입력해주세요." };
    guestPasswordHash = await hashPassword(guestPasswd);
  }

  const result = await createOrder({
    cartId,
    memberId: session?.userId ?? null,
    direct,
    device,
    name,
    cell,
    email,
    name2,
    cell2,
    postcode,
    address1,
    address2,
    message,
    guestPasswordHash,
    payType,
    couponUid,
    useMileage: useMileageAmount,
    clientPayTotal,
    config,
    eventDiscounts,
    priceLimitConfig,
    memberDiscountPct,
  });

  if (!result.ok) return { error: result.error };
  redirect(`/order/complete?order_num=${result.orderNum}`);
}
