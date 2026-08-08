"use server";

import { revalidatePath } from "next/cache";
import { orderStatus4, orderStatus5, updateDeliveryProgress } from "@shoppingmall/core";
import { assertOwnsOrderLines } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";

export type ActionState = { error?: string };

// Vendor twin of app/(protected)/orders/[orderNum]/actions.ts — exposes only
// the delivery-progress subset (no payment confirm/cancel/refund, matching
// the plan's design decision #5), and verifies every og_uid actually belongs
// to this vendor's vendor_delivery scope before delegating to order.ts.
export async function vendorUpdateDeliveryProgressAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireVendor();
  const orderNum = String(formData.get("orderNum") ?? "");
  const ogUids = formData.getAll("ogUid").map(Number).filter(Number.isInteger);
  if (ogUids.length === 0) return { error: "상품을 선택해 주세요." };
  if (!(await assertOwnsOrderLines(session.vendorId ?? "", orderNum, ogUids))) return { error: "본인 주문상품만 처리할 수 있습니다." };

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
  revalidatePath(`/vendor/orders/${orderNum}`);
  return {};
}

export async function vendorOrderStatus4Action(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireVendor();
  const orderNum = String(formData.get("orderNum") ?? "");
  const ogUid = Number(formData.get("ogUid"));
  if (!(await assertOwnsOrderLines(session.vendorId ?? "", orderNum, [ogUid]))) return { error: "본인 주문상품만 처리할 수 있습니다." };

  const result = await orderStatus4(orderNum, ogUid, session.userId);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/vendor/orders/${orderNum}`);
  return {};
}

export async function vendorOrderStatus5Action(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireVendor();
  const orderNum = String(formData.get("orderNum") ?? "");
  const ogUid = Number(formData.get("ogUid"));
  if (!(await assertOwnsOrderLines(session.vendorId ?? "", orderNum, [ogUid]))) return { error: "본인 주문상품만 처리할 수 있습니다." };

  const result = await orderStatus5(orderNum, ogUid, session.userId);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/vendor/orders/${orderNum}`);
  return {};
}
