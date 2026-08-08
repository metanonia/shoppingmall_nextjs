"use server";

import { revalidatePath } from "next/cache";
import { updateWidgetLayout, type DashboardWidgetKey } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

const WIDGET_KEYS: DashboardWidgetKey[] = ["todayOrderCount", "todaySalesTotal", "unansweredCounselCount", "unansweredInquiryCount", "unansweredVendorCounselCount", "activeOrderChangeCount", "pendingCashReceiptCount", "pendingGoodsCount", "pendingVendorCount", "memberCount", "shippingCount", "errorCount"];

export async function updateWidgetLayoutAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const order = formData.getAll("order").map(String) as DashboardWidgetKey[];
  const layout = order.filter((k) => WIDGET_KEYS.includes(k)).map((key) => ({ key, visible: formData.get(`visible_${key}`) === "on" }));
  await updateWidgetLayout(session.userId, layout);
  revalidatePath("/");
}
