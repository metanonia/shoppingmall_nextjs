"use server";

import { revalidatePath } from "next/cache";
import { confirmSettlement, getAdminVendorByUid, updateSettlementStatus } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export type ActionState = { error?: string; success?: boolean };

export async function confirmSettlementAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const vendorUid = Number(formData.get("vendorUid"));
  const dateFrom = String(formData.get("dateFrom") ?? "");
  const dateTo = String(formData.get("dateTo") ?? "");
  if (!dateFrom || !dateTo) return { error: "정산 기간을 선택해 주세요." };

  const vendor = await getAdminVendorByUid(vendorUid);
  if (!vendor) return { error: "존재하지 않는 입점사입니다." };

  const result = await confirmSettlement(vendor.id, dateFrom, dateTo, {
    bankName: String(formData.get("bankName") ?? ""),
    bankNum: String(formData.get("bankNum") ?? ""),
    bankOwner: String(formData.get("bankOwner") ?? ""),
  });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/vendors/${vendorUid}/settlement`);
  return { success: true };
}

export async function updateSettlementStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const vendorUid = Number(formData.get("vendorUid"));
  await updateSettlementStatus(Number(formData.get("uid")), { taxBill: formData.get("taxBill") === "on", status: formData.get("status") === "on" });
  revalidatePath(`/vendors/${vendorUid}/settlement`);
}
