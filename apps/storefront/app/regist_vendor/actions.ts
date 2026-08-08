"use server";

import { registerVendor } from "@shoppingmall/core";
import { saveVendorApplicationDocs } from "@/lib/vendor-doc-upload";

export type RegisterVendorFormState = { error?: string; success?: boolean };

// Port of php/regist_vendor_post.php. Unlike member registration, this
// doesn't log the applicant in on success — a freshly submitted vendor is
// auth='R' (pending) and can't pass authenticateVendor() until an admin
// approves it (Phase 7's /vendors screen). This just confirms submission.
export async function registerVendorAction(_prevState: RegisterVendorFormState, formData: FormData): Promise<RegisterVendorFormState> {
  const agree = formData.get("agree");
  if (!agree) return { error: "필수 동의 항목에 체크해 주세요." };

  const vendorId = String(formData.get("id") ?? "").trim();
  if (!vendorId) return { error: "아이디를 입력해 주세요." };
  const image1File = formData.get("image1");
  const image2File = formData.get("image2");
  const docs = await saveVendorApplicationDocs(vendorId, [image1File instanceof File ? image1File : new File([], ""), image2File instanceof File ? image2File : new File([], "")]);
  if (!docs.ok) return { error: docs.error };
  const result = await registerVendor({
    id: vendorId,
    password: String(formData.get("passwd") ?? ""),
    compName: String(formData.get("compName") ?? "").trim(),
    compOwner: String(formData.get("compOwner") ?? "").trim(),
    compLicenseNo: String(formData.get("compLicenseNo") ?? "").trim(),
    compPostcode: String(formData.get("compPostcode") ?? ""),
    compAddress1: String(formData.get("compAddress1") ?? ""),
    compAddress2: String(formData.get("compAddress2") ?? ""),
    compType: String(formData.get("compType") ?? ""),
    compItem: String(formData.get("compItem") ?? ""),
    compEmail: String(formData.get("compEmail") ?? "").trim(),
    compTel: String(formData.get("compTel") ?? ""),
    compFax: String(formData.get("compFax") ?? ""),
    contName: String(formData.get("contName") ?? "").trim(),
    contCell: String(formData.get("contCell") ?? ""),
    contEmail: String(formData.get("contEmail") ?? ""),
    contPart: String(formData.get("contPart") ?? ""),
    contPosition: String(formData.get("contPosition") ?? ""),
    accountCycle: Number(formData.get("accountCycle") ?? 1) || 1,
    bankName: String(formData.get("bankName") ?? ""),
    bankNum: String(formData.get("bankNum") ?? ""),
    bankOwner: String(formData.get("bankOwner") ?? ""),
    image1: docs.filenames[0] ?? "",
    image2: docs.filenames[1] ?? "",
  });

  if (!result.ok) return { error: result.error };
  return { success: true };
}
