"use server";

import { revalidatePath } from "next/cache";
import {
  updateAgreementPages,
  updateBasicConfig,
  updateDeliveryConfig,
  updateGoodsConfig,
  updateMemberFormConfig,
  updatePaymentConfig,
  updateSocialConfig,
} from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export type ActionState = { error?: string; success?: boolean };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function updateBasicConfigAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  await updateBasicConfig({
    basicName: str(formData, "basicName"),
    basicTitle: str(formData, "basicTitle"),
    basicDescription: str(formData, "basicDescription"),
    basicKeyword: str(formData, "basicKeyword"),
    basicUrl: str(formData, "basicUrl"),
    basicAdmin: str(formData, "basicAdmin"),
    basicEmail: str(formData, "basicEmail"),
    compName: str(formData, "compName"),
    compOwner: str(formData, "compOwner"),
    compTel: str(formData, "compTel"),
    compFax: str(formData, "compFax"),
    compAddress1: str(formData, "compAddress1"),
    compAddress2: str(formData, "compAddress2"),
    csTime1: str(formData, "csTime1"),
    csTime2: str(formData, "csTime2"),
    csTime3: str(formData, "csTime3"),
    csTime4: str(formData, "csTime4"),
  });
  revalidatePath("/settings/basic");
  return { success: true };
}

export async function updateDeliveryConfigAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const deliveryType = str(formData, "deliveryType");
  await updateDeliveryConfig({
    deliveryType: deliveryType === "F" || deliveryType === "D" ? deliveryType : "P",
    deliveryDPrice: Number(formData.get("deliveryDPrice") ?? 0) || 0,
    deliveryPPrice1: Number(formData.get("deliveryPPrice1") ?? 0) || 0,
    deliveryPPrice2: Number(formData.get("deliveryPPrice2") ?? 0) || 0,
    orderCancelInfo: str(formData, "orderCancelInfo"),
    orderMessageInfo: str(formData, "orderMessageInfo"),
    orderAutoCompleted1: Math.max(0, Number(formData.get("orderAutoCompleted1") ?? 0) || 0),
    orderAutoCompleted2: Math.max(0, Number(formData.get("orderAutoCompleted2") ?? 0) || 0),
    orderAutoCompleted3: Math.max(0, Number(formData.get("orderAutoCompleted3") ?? 0) || 0),
    orderTrackerEnabled: formData.get("orderTrackerEnabled") === "on",
    orderTrackerKey: str(formData, "orderTrackerKey"),
  });
  revalidatePath("/settings/delivery");
  return { success: true };
}

export async function updatePaymentConfigAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  await updatePaymentConfig({
    paymentTypeB: formData.get("paymentTypeB") === "on",
    paymentTypeC: formData.get("paymentTypeC") === "on",
    paymentTypeR: formData.get("paymentTypeR") === "on",
    paymentTypeV: formData.get("paymentTypeV") === "on",
    paymentTypeH: formData.get("paymentTypeH") === "on",
    paymentCp: str(formData, "paymentCp"),
    paymentShopId: str(formData, "paymentShopId"),
    paymentShopKey: str(formData, "paymentShopKey"),
    paymentBankInfo: str(formData, "paymentBankInfo"),
    cashReceiptsUsed: formData.get("cashReceiptsUsed") === "on",
    cashReceiptsRequired: formData.get("cashReceiptsRequired") === "on",
    cashReceiptsMethod: Number(formData.get("cashReceiptsMethod") ?? 0) === 1 ? 1 : 0,
    cashReceiptsType: Number(formData.get("cashReceiptsType") ?? 0) === 1 ? 1 : 0,
    naverPayUsed: formData.get("naverPayUsed") === "on",
    naverPayMode: Number(formData.get("naverPayMode") ?? 0) === 1 ? 1 : 0,
    naverPayTestId: str(formData, "naverPayTestId"),
    naverPayShopId: str(formData, "naverPayShopId"),
    naverPayCertKey: str(formData, "naverPayCertKey"),
    naverPayButtonKey: str(formData, "naverPayButtonKey"),
    naverPayCommonKey: str(formData, "naverPayCommonKey"),
  });
  revalidatePath("/settings/payment");
  return { success: true };
}

export async function updateAgreementAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  await updateAgreementPages({ terms: str(formData, "terms"), privacy: str(formData, "privacy") });
  revalidatePath("/settings/agreement");
  return { success: true };
}

export async function updateGoodsConfigAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const lines = (name: string) => String(formData.get(name) ?? "").split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  await updateGoodsConfig({
    priceLimit1: Number(formData.get("priceLimit1") ?? 0) || 0,
    priceLimit2: Number(formData.get("priceLimit2") ?? 0) || 0,
    goodsSoldout: ([0, 1, 2].includes(Number(formData.get("goodsSoldout"))) ? Number(formData.get("goodsSoldout")) : 0) as 0 | 1 | 2,
    optionInfo: lines("optionInfo"),
    brandInfo: lines("brandInfo"),
    makeInfo: lines("makeInfo"),
    originInfo: lines("originInfo"),
    requireInfo: str(formData, "requireInfo"),
    iconInfo: lines("iconInfo"),
    engineNaver: formData.get("engineNaver") === "on",
    engineDaum: formData.get("engineDaum") === "on",
    deliveryInfo: str(formData, "deliveryInfo"),
    refundInfo: str(formData, "refundInfo"),
    exchangeInfo: str(formData, "exchangeInfo"),
    asInfo: str(formData, "asInfo"),
  });
  revalidatePath("/settings/goods");
  return { success: true };
}

const SOCIAL_SITES = ["NAVER", "KAKAO", "GOOGLE", "PAYCO"] as const;

export async function updateMemberConfigAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const requiredLevel = (key: string): 0 | 1 | 2 => {
    const n = Number(formData.get(key) ?? 0);
    return n === 1 || n === 2 ? n : 0;
  };

  await updateMemberFormConfig({
    telRequired: requiredLevel("telRequired"),
    cellRequired: requiredLevel("cellRequired"),
    addressRequired: requiredLevel("addressRequired"),
    birthRequired: requiredLevel("birthRequired"),
    genderRequired: requiredLevel("genderRequired"),
    marryRequired: requiredLevel("marryRequired"),
    jobRequired: requiredLevel("jobRequired"),
    hobbyRequired: requiredLevel("hobbyRequired"),
    compRequired: requiredLevel("compRequired"),
    compNumRequired: requiredLevel("compNumRequired"),
    compOwnerRequired: requiredLevel("compOwnerRequired"),
    compAddressRequired: requiredLevel("compAddressRequired"),
    compTypeRequired: requiredLevel("compTypeRequired"),
    compItemRequired: requiredLevel("compItemRequired"),
    jobOptions: str(formData, "jobOptions").split("|").map((value) => value.trim()).filter(Boolean),
    hobbyOptions: str(formData, "hobbyOptions").split("|").map((value) => value.trim()).filter(Boolean),
    customFields: ([1, 2, 3, 4, 5] as const).map((number) => ({
      key: `add${number}` as const,
      title: str(formData, `add${number}Title`),
      required: requiredLevel(`add${number}Required`),
    })),
    maillingEnabled: formData.get("maillingEnabled") === "on",
    smsEnabled: formData.get("smsEnabled") === "on",
    memberAuthAuto: formData.get("memberAuthAuto") === "on",
    loginLimitCount: Number(formData.get("loginLimitCount") ?? 0) || 0,
    loginLimitMinutes: Number(formData.get("loginLimitMinutes") ?? 0) || 0,
    mileageEnabled: formData.get("mileageEnabled") === "on",
    joinMileage: Number(formData.get("joinMileage") ?? 0) || 0,
    orderMileage: Number(formData.get("orderMileage") ?? 0) || 0,
  });

  for (const site of SOCIAL_SITES) {
    await updateSocialConfig(site, {
      used: formData.get(`social_${site}_used`) === "on",
      apiId: str(formData, `social_${site}_apiId`),
      apiKey: str(formData, `social_${site}_apiKey`),
    });
  }

  revalidatePath("/settings/member");
  return { success: true };
}
