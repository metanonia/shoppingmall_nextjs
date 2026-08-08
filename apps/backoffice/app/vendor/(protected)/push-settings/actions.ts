"use server";
import { revalidatePath } from "next/cache";
import { updateVendorPushToken } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";
export async function updateVendorPushAction(formData: FormData) { const session = await requireVendor(); await updateVendorPushToken(session.vendorId ?? session.userId, { enabled: formData.get("enabled") === "on", pc: String(formData.get("pc") ?? ""), mobile: String(formData.get("mobile") ?? "") }); revalidatePath("/vendor/push-settings"); }
