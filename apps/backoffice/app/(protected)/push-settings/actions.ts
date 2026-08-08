"use server";
import { revalidatePath } from "next/cache";
import { updateAdminPushToken, updateFirebaseWebConfig } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";
export async function updateAdminPushAction(formData: FormData) { const session = await requireAdmin(); await updateAdminPushToken(session.userId, { enabled: formData.get("enabled") === "on", pc: String(formData.get("pc") ?? ""), mobile: String(formData.get("mobile") ?? "") }); revalidatePath("/push-settings"); }

export async function updateFirebaseWebConfigAction(formData: FormData) {
  await requireAdmin();
  await updateFirebaseWebConfig({
    apiKey: String(formData.get("apiKey") ?? ""),
    authDomain: String(formData.get("authDomain") ?? ""),
    projectId: String(formData.get("projectId") ?? ""),
    storageBucket: String(formData.get("storageBucket") ?? ""),
    messagingSenderId: String(formData.get("messagingSenderId") ?? ""),
    appId: String(formData.get("appId") ?? ""),
    vapidKey: String(formData.get("vapidKey") ?? ""),
  });
  revalidatePath("/push-settings");
}
