"use server";

import { cancelGuestOrderChangeRequest, cancelOrder, getOrderChanges, type OrderDetailView, getOrderDetail, requestGuestOrderChange } from "@shoppingmall/core";

export type GuestOrderLookupState = { error?: string; detail?: OrderDetailView; changes?: Awaited<ReturnType<typeof getOrderChanges>> };

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
  return { detail, changes: await getOrderChanges({ orderNum }) };
}

export type CancelGuestOrderState = { error?: string; success?: boolean };
export type GuestOrderChangeState = { error?: string; success?: boolean };

export async function cancelGuestOrderChangeAction(_prevState: GuestOrderChangeState, formData: FormData): Promise<GuestOrderChangeState> {
  const result = await cancelGuestOrderChangeRequest({ uid: Number(formData.get("uid")), orderNum: String(formData.get("orderNum") ?? ""), guestName: String(formData.get("guestName") ?? ""), guestPasswordPlain: String(formData.get("guestPasswd") ?? "") });
  return result.ok ? { success: true } : { error: result.error };
}

export async function requestGuestOrderChangeAction(_prevState: GuestOrderChangeState, formData: FormData): Promise<GuestOrderChangeState> {
  const type = Number(formData.get("type"));
  if (type !== 7 && type !== 8 && type !== 9) return { error: "요청 종류를 확인해주세요." };
  const result = await requestGuestOrderChange({
    orderNum: String(formData.get("orderNum") ?? ""),
    ogUid: Number(formData.get("ogUid")),
    guestName: String(formData.get("guestName") ?? ""),
    guestPasswordPlain: String(formData.get("guestPasswd") ?? ""),
    type,
    reason: String(formData.get("reason") ?? ""),
    message: String(formData.get("message") ?? ""),
    bankInfo: String(formData.get("bankInfo") ?? ""),
  });
  return result.ok ? { success: true } : { error: result.error };
}

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
