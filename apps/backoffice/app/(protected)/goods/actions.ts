"use server";

import { redirect } from "next/navigation";
import {
  createGoods,
  createGoodsOptions,
  deleteGoodsOption,
  updateGoods,
  updateGoodsOption,
  type GoodsFormInput,
} from "@shoppingmall/core";
import { saveImage } from "@/lib/image-upload";

export type ActionState = { error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function num(formData: FormData, key: string): number {
  return Number(formData.get(key) ?? 0) || 0;
}

function checked(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

async function uploadIfPresent(formData: FormData, key: string, existing: string): Promise<{ ok: true; filename: string } | { ok: false; error: string }> {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) return { ok: true, filename: existing };
  const result = await saveImage("goods", file);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, filename: result.filename };
}

async function uploadMultiple(formData: FormData, key: string): Promise<{ ok: true; filenames: string[] } | { ok: false; error: string }> {
  const files = formData.getAll(key).filter((f): f is File => f instanceof File && f.size > 0);
  const filenames: string[] = [];
  for (const file of files) {
    const result = await saveImage("goods", file);
    if (!result.ok) return { ok: false, error: result.error };
    filenames.push(result.filename);
  }
  return { ok: true, filenames };
}

async function buildGoodsInput(
  formData: FormData,
  existing: { image1: string; image2: string; image3: string; otherImages: string[]; detailImages: string[] },
): Promise<{ ok: true; input: GoodsFormInput } | { ok: false; error: string }> {
  const image1 = await uploadIfPresent(formData, "image1", existing.image1);
  if (!image1.ok) return image1;
  const image2 = await uploadIfPresent(formData, "image2", existing.image2);
  if (!image2.ok) return image2;
  const image3 = await uploadIfPresent(formData, "image3", existing.image3);
  if (!image3.ok) return image3;
  const otherImages = await uploadMultiple(formData, "otherImages");
  if (!otherImages.ok) return otherImages;
  const detailImages = await uploadMultiple(formData, "detailImages");
  if (!detailImages.ok) return detailImages;

  const cateList = formData.getAll("cateList").map((v) => BigInt(String(v)));
  const repCateRaw = str(formData, "repCate");
  const repCate = repCateRaw ? BigInt(repCateRaw) : cateList[0];

  const makingInfo = [0, 1, 2, 3, 4]
    .map((i) => ({ name: str(formData, `makingName${i}`), value: str(formData, `makingValue${i}`) }))
    .filter((m) => m.name);

  const input: GoodsFormInput = {
    name: str(formData, "name"),
    name_code_able: str(formData, "name_code_able"),
    vendor: str(formData, "vendor"),
    cateList,
    repCate,
    price: num(formData, "price"),
    orig_price: num(formData, "orig_price"),
    consumer_price: num(formData, "consumer_price"),
    price_ment: str(formData, "price_ment"),
    commission_type: num(formData, "commission_type"),
    commission: num(formData, "commission"),
    image1: image1.filename,
    image2: image2.filename || image1.filename,
    image3: image3.filename || image1.filename,
    otherImages: [...existing.otherImages, ...otherImages.filenames],
    detailImages: [...existing.detailImages, ...detailImages.filenames],
    detail_image_only: checked(formData, "detail_image_only"),
    detail_image_type: num(formData, "detail_image_type") === 2 ? 2 : 1,
    explains: str(formData, "explains"),
    detail: str(formData, "detail"),
    goods_code: str(formData, "goods_code"),
    model: str(formData, "model"),
    make: str(formData, "make"),
    origin: str(formData, "origin"),
    brand: str(formData, "brand"),
    makingInfo,
    qty_type: num(formData, "qty_type"),
    qty: num(formData, "qty"),
    limit_qty: num(formData, "limit_qty"),
    option_use: checked(formData, "option_use"),
    display_use: checked(formData, "display_use"),
    sale_use: checked(formData, "sale_use"),
    order_priority: num(formData, "order_priority") || 5,
    icons: str(formData, "icons")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    mileage_type: num(formData, "mileage_type") === 4 ? 4 : 0,
    mileage_common: num(formData, "mileage_common"),
    delivery_type: num(formData, "delivery_type") || 1,
    delivery_price: num(formData, "delivery_price"),
    delivery_info: str(formData, "delivery_info"),
    refund_info: str(formData, "refund_info"),
    exchange_info: str(formData, "exchange_info"),
    as_info: str(formData, "as_info"),
    keyword: str(formData, "keyword"),
    cate_hide: checked(formData, "cate_hide"),
    vendor_hide: checked(formData, "vendor_hide"),
  };

  return { ok: true, input };
}

export async function createGoodsAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const built = await buildGoodsInput(formData, { image1: "", image2: "", image3: "", otherImages: [], detailImages: [] });
  if (!built.ok) return { error: built.error };

  const result = await createGoods(built.input);
  if (!result.ok) return { error: result.error };
  redirect(`/goods/${result.uid}/edit`);
}

export async function updateGoodsAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const uid = Number(formData.get("uid"));
  const existing = {
    image1: str(formData, "existingImage1"),
    image2: str(formData, "existingImage2"),
    image3: str(formData, "existingImage3"),
    otherImages: formData.getAll("existingOtherImages").map(String),
    detailImages: formData.getAll("existingDetailImages").map(String),
  };
  const built = await buildGoodsInput(formData, existing);
  if (!built.ok) return { error: built.error };

  const result = await updateGoods(uid, built.input);
  if (!result.ok) return { error: result.error };
  redirect(`/goods/${uid}/edit`);
}

export type OptionActionState = { error?: string };

export async function createGoodsOptionsAction(_prevState: OptionActionState, formData: FormData): Promise<OptionActionState> {
  const guid = Number(formData.get("guid"));
  const dimensions = [0, 1, 2]
    .map((i) => ({
      name: str(formData, `dimName${i}`),
      values: str(formData, `dimValues${i}`)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    }))
    .filter((d) => d.name && d.values.length > 0);

  if (dimensions.length === 0) return { error: "옵션명과 값을 입력해 주세요." };

  const result = await createGoodsOptions(guid, dimensions);
  if (!result.ok) return { error: result.error };
  redirect(`/goods/${guid}/edit`);
}

export async function updateGoodsOptionAction(_prevState: OptionActionState, formData: FormData): Promise<OptionActionState> {
  const uid = Number(formData.get("uid"));
  const guid = Number(formData.get("guid"));
  const result = await updateGoodsOption(uid, {
    price: num(formData, "price"),
    qtyType: checked(formData, "qtyTypeInfinite") ? 1 : 0,
    qty: num(formData, "qty"),
    used: checked(formData, "used"),
    code: str(formData, "code"),
  });
  if (!result.ok) return { error: result.error };
  redirect(`/goods/${guid}/edit`);
}

export async function deleteGoodsOptionAction(formData: FormData): Promise<void> {
  const uid = Number(formData.get("uid"));
  const guid = Number(formData.get("guid"));
  await deleteGoodsOption(uid);
  redirect(`/goods/${guid}/edit`);
}
