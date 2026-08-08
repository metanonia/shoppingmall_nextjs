"use server";

import { revalidatePath } from "next/cache";
import { changeVendorPassword, updateVendorInfo } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";
import { saveVendorDoc } from "@/lib/vendor-doc-upload";

export type ActionState = { error?: string; success?: boolean };

async function uploadIfPresent(
  vendorId: string,
  formData: FormData,
  key: string,
  existing: string,
): Promise<{ ok: true; filename: string } | { ok: false; error: string }> {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) return { ok: true, filename: existing };
  const result = await saveVendorDoc(vendorId, file);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, filename: result.filename };
}

export async function updateVendorInfoAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireVendor();
  const vendorId = session.vendorId ?? "";

  const image1 = await uploadIfPresent(vendorId, formData, "image1", String(formData.get("existingImage1") ?? ""));
  if (!image1.ok) return { error: image1.error };
  const image2 = await uploadIfPresent(vendorId, formData, "image2", String(formData.get("existingImage2") ?? ""));
  if (!image2.ok) return { error: image2.error };

  const result = await updateVendorInfo(vendorId, {
    compName: String(formData.get("compName") ?? "").trim(),
    compOwner: String(formData.get("compOwner") ?? "").trim(),
    compLicenseNo: String(formData.get("compLicenseNo") ?? "").trim(),
    compPostcode: String(formData.get("compPostcode") ?? ""),
    compAddress1: String(formData.get("compAddress1") ?? ""),
    compAddress2: String(formData.get("compAddress2") ?? ""),
    compType: String(formData.get("compType") ?? ""),
    compItem: String(formData.get("compItem") ?? ""),
    compEmail: String(formData.get("compEmail") ?? "").trim(),
    compTel: String(formData.get("compTel") ?? "").trim(),
    compFax: String(formData.get("compFax") ?? ""),
    contName: String(formData.get("contName") ?? ""),
    contCell: String(formData.get("contCell") ?? ""),
    contEmail: String(formData.get("contEmail") ?? ""),
    contPart: String(formData.get("contPart") ?? ""),
    contPosition: String(formData.get("contPosition") ?? ""),
    bankName: String(formData.get("bankName") ?? "").trim(),
    bankNum: String(formData.get("bankNum") ?? "").trim(),
    bankOwner: String(formData.get("bankOwner") ?? "").trim(),
    image1: image1.filename,
    image2: image2.filename,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/vendor/profile");
  return { success: true };
}

export async function changeVendorPasswordAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireVendor();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("newPasswordConfirm") ?? "");

  if (next.length < 4) return { error: "새 비밀번호는 4자 이상이어야 합니다." };
  if (next !== confirm) return { error: "새 비밀번호가 일치하지 않습니다." };

  const result = await changeVendorPassword(session.vendorId ?? "", current, next);
  if (!result.ok) return { error: result.error };
  return { success: true };
}
