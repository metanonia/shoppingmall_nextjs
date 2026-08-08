"use server";

import { revalidatePath } from "next/cache";
import { deleteRecentViewedGoods } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";

export async function deleteRecentViewedGoodsAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await deleteRecentViewedGoods(session.userId, Number(formData.get("goodsUid")));
  revalidatePath("/my_recent_goods");
}
