"use server";

import { redirect } from "next/navigation";
import {
  createGoods,
  createGoodsOptions,
  deleteGoodsOption,
  getAdminGoodsDetail,
  getVendorProfile,
  updateGoods,
  updateGoodsOption,
} from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";
import { buildGoodsInput, type ActionState, type OptionActionState } from "@/app/(protected)/goods/actions";

// Vendor twin of app/(protected)/goods/actions.ts — reuses buildGoodsInput
// (same field parsing/image upload) but forces `vendor` to the caller's own
// id (never trusts the client-submitted value) and derives auto-approval
// from Vendor.goods_auth instead of always auto-approving like admin.
export async function createVendorGoodsAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireVendor();
  const vendorId = session.vendorId ?? "";
  formData.set("vendor", vendorId);

  const built = await buildGoodsInput(formData, { image1: "", image2: "", image3: "", otherImages: [], detailImages: [] });
  if (!built.ok) return { error: built.error };

  const profile = await getVendorProfile(vendorId);
  const result = await createGoods(built.input, { autoApprove: profile?.goodsAuth === "A" });
  if (!result.ok) return { error: result.error };
  redirect(`/vendor/goods/${result.uid}/edit`);
}

export async function updateVendorGoodsAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireVendor();
  const vendorId = session.vendorId ?? "";
  const uid = Number(formData.get("uid"));

  const existingGoods = await getAdminGoodsDetail(uid);
  if (!existingGoods || existingGoods.vendor !== vendorId) return { error: "본인 상품만 수정할 수 있습니다." };

  formData.set("vendor", vendorId);
  const existing = {
    image1: String(formData.get("existingImage1") ?? ""),
    image2: String(formData.get("existingImage2") ?? ""),
    image3: String(formData.get("existingImage3") ?? ""),
    otherImages: formData.getAll("existingOtherImages").map(String),
    detailImages: formData.getAll("existingDetailImages").map(String),
  };
  const built = await buildGoodsInput(formData, existing);
  if (!built.ok) return { error: built.error };

  const result = await updateGoods(uid, built.input);
  if (!result.ok) return { error: result.error };
  redirect(`/vendor/goods/${uid}/edit`);
}

async function assertOwnsGoods(vendorId: string, guid: number): Promise<boolean> {
  const goods = await getAdminGoodsDetail(guid);
  return Boolean(goods && goods.vendor === vendorId);
}

export async function createVendorGoodsOptionsAction(_prevState: OptionActionState, formData: FormData): Promise<OptionActionState> {
  const session = await requireVendor();
  const guid = Number(formData.get("guid"));
  if (!(await assertOwnsGoods(session.vendorId ?? "", guid))) return { error: "본인 상품만 관리할 수 있습니다." };

  const dimensions = [0, 1, 2]
    .map((i) => ({
      name: String(formData.get(`dimName${i}`) ?? "").trim(),
      values: String(formData.get(`dimValues${i}`) ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    }))
    .filter((d) => d.name && d.values.length > 0);
  if (dimensions.length === 0) return { error: "옵션명과 값을 입력해 주세요." };

  const result = await createGoodsOptions(guid, dimensions);
  if (!result.ok) return { error: result.error };
  redirect(`/vendor/goods/${guid}/edit`);
}

export async function updateVendorGoodsOptionAction(_prevState: OptionActionState, formData: FormData): Promise<OptionActionState> {
  const session = await requireVendor();
  const uid = Number(formData.get("uid"));
  const guid = Number(formData.get("guid"));
  if (!(await assertOwnsGoods(session.vendorId ?? "", guid))) return { error: "본인 상품만 관리할 수 있습니다." };

  const result = await updateGoodsOption(uid, {
    price: Number(formData.get("price") ?? 0) || 0,
    qtyType: formData.get("qtyTypeInfinite") === "on" ? 1 : 0,
    qty: Number(formData.get("qty") ?? 0) || 0,
    used: formData.get("used") === "on",
    code: String(formData.get("code") ?? "").trim(),
  });
  if (!result.ok) return { error: result.error };
  redirect(`/vendor/goods/${guid}/edit`);
}

export async function deleteVendorGoodsOptionAction(formData: FormData): Promise<void> {
  const session = await requireVendor();
  const uid = Number(formData.get("uid"));
  const guid = Number(formData.get("guid"));
  if (!(await assertOwnsGoods(session.vendorId ?? "", guid))) redirect(`/vendor/goods`);

  await deleteGoodsOption(uid);
  redirect(`/vendor/goods/${guid}/edit`);
}
