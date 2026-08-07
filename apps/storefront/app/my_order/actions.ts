"use server";

import { revalidatePath } from "next/cache";
import { cancelOrder } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";

export type CancelOrderFormState = { error?: string; success?: boolean };

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
