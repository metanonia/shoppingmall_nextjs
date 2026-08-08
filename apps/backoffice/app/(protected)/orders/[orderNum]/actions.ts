"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  confirmBankTransferPayment,
  orderStatus4,
  orderStatus5,
  orderStatus9,
  orderStatus95,
  partialRefundOrder,
  updateDeliveryProgress,
  updateOrderAddress,
  updateOrderMemo,
} from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export type ActionState = { error?: string };

export async function confirmBankTransferAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const orderNum = String(formData.get("orderNum") ?? "");
  const result = await confirmBankTransferPayment(orderNum, session.userId);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/orders/${orderNum}`);
  return {};
}

export async function updateDeliveryProgressAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const orderNum = String(formData.get("orderNum") ?? "");
  const ogUids = formData.getAll("ogUid").map(Number).filter(Number.isInteger);
  if (ogUids.length === 0) return { error: "상품을 선택해 주세요." };

  const status = Number(formData.get("status"));
  const result =
    status === 3
      ? await updateDeliveryProgress(orderNum, ogUids, session.userId, {
          status: 3,
          carrier: String(formData.get("carrier") ?? ""),
          trackingNumber: String(formData.get("trackingNumber") ?? ""),
        })
      : await updateDeliveryProgress(orderNum, ogUids, session.userId, { status: 2 });

  if (!result.ok) return { error: result.error };
  revalidatePath(`/orders/${orderNum}`);
  return {};
}

export async function orderStatus4Action(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const orderNum = String(formData.get("orderNum") ?? "");
  const ogUid = Number(formData.get("ogUid"));
  const result = await orderStatus4(orderNum, ogUid, session.userId);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/orders/${orderNum}`);
  return {};
}

export async function orderStatus5Action(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const orderNum = String(formData.get("orderNum") ?? "");
  const ogUid = Number(formData.get("ogUid"));
  const result = await orderStatus5(orderNum, ogUid, session.userId);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/orders/${orderNum}`);
  return {};
}

// Admin full-cancel — dispatches to orderStatus9 (unpaid) or orderStatus95
// (paid) based on pay_status, same dispatch order.ts's cancelOrder() does
// for the customer-facing path, but without the member/guest ownership
// check (the caller already holds an admin session).
export async function adminCancelOrderAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const orderNum = String(formData.get("orderNum") ?? "");
  const payStatus = String(formData.get("payStatus") ?? "");
  const result = payStatus === "C" ? await orderStatus95(orderNum, session.userId) : await orderStatus9(orderNum, session.userId);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/orders/${orderNum}`);
  return {};
}

export async function updateMemoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const orderNum = String(formData.get("orderNum") ?? "");
  const memo = String(formData.get("memo") ?? "");
  const result = await updateOrderMemo(orderNum, memo);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/orders/${orderNum}`);
  return {};
}

export async function updateAddressAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const orderNum = String(formData.get("orderNum") ?? "");
  const result = await updateOrderAddress(orderNum, {
    postcode: String(formData.get("postcode") ?? ""),
    address1: String(formData.get("address1") ?? ""),
    address2: String(formData.get("address2") ?? ""),
  });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/orders/${orderNum}`);
  return {};
}

export async function partialRefundAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const orderNum = String(formData.get("orderNum") ?? "");
  const ogUid = Number(formData.get("ogUid"));

  const result = await partialRefundOrder(
    orderNum,
    ogUid,
    {
      refund: Number(formData.get("refund") ?? 0),
      mileage: Number(formData.get("mileage") ?? 0),
      refundFee: Number(formData.get("refundFee") ?? 0),
      coupon: Number(formData.get("coupon") ?? 0),
    },
    session.userId,
  );
  if (!result.ok) return { error: result.error };

  revalidatePath(`/orders/${orderNum}`);
  redirect(`/orders/${orderNum}`);
}
