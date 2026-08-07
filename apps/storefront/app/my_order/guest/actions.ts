"use server";

import { cancelOrder, type OrderDetailView, getOrderDetail } from "@shoppingmall/core";

export type GuestOrderLookupState = { error?: string; detail?: OrderDetailView };

// Guest twin of /my_order/[order_num] — looks up a single order by number +
// name + order password instead of a member session. See order.ts's
// getOrderDetail comment on why this isn't a full guest order *list*.
export async function lookupGuestOrderAction(
  _prevState: GuestOrderLookupState,
  formData: FormData,
): Promise<GuestOrderLookupState> {
  const orderNum = String(formData.get("orderNum") ?? "").trim();
  const guestName = String(formData.get("guestName") ?? "").trim();
  const guestPasswordPlain = String(formData.get("guestPasswd") ?? "");

  if (!orderNum || !guestName || !guestPasswordPlain) return { error: "주문번호, 이름, 비밀번호를 모두 입력해주세요." };

  const detail = await getOrderDetail(orderNum, { guestName, guestPasswordPlain });
  if (!detail) return { error: "주문 정보를 찾을 수 없습니다." };
  return { detail };
}

export type CancelGuestOrderState = { error?: string; success?: boolean };

export async function cancelGuestOrderAction(
  _prevState: CancelGuestOrderState,
  formData: FormData,
): Promise<CancelGuestOrderState> {
  const orderNum = String(formData.get("orderNum") ?? "");
  const guestName = String(formData.get("guestName") ?? "");
  const guestPasswordPlain = String(formData.get("guestPasswd") ?? "");

  const result = await cancelOrder(orderNum, { guestName, guestPasswordPlain });
  if (!result.ok) return { error: result.error };
  return { success: true };
}
