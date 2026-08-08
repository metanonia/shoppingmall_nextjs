"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addExhibitionGoods, createExhibition, removeExhibitionGoods, updateExhibition, type ExhibitionFormInput } from "@shoppingmall/core";
import { saveImage } from "@/lib/image-upload";

export type ActionState = { error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function buildInput(formData: FormData, existingImage1: string): Promise<ExhibitionFormInput> {
  let image1 = existingImage1;
  const file = formData.get("image1");
  if (file instanceof File && file.size > 0) {
    const uploaded = await saveImage("goods", file);
    if (uploaded.ok) image1 = uploaded.filename;
  }

  const sDateStr = str(formData, "sDate");
  const eDateStr = str(formData, "eDate");

  return {
    name: str(formData, "name"),
    discountYn: formData.get("discountYn") === "on" ? "Y" : "N",
    discount: Number(formData.get("discount") ?? 0) || 0,
    sDate: sDateStr ? new Date(sDateStr) : null,
    eDate: eDateStr ? new Date(eDateStr) : null,
    image1,
    detailImages: [],
    detailImageOnly: false,
    detailImageType: 1,
    explains: str(formData, "explains"),
    status: Number(formData.get("status") ?? 0) || 0,
  };
}

export async function createExhibitionAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const input = await buildInput(formData, "");
  const result = await createExhibition(input);
  if (!result.ok) return { error: result.error };
  redirect(`/exhibitions/${result.uid}/edit`);
}

export async function updateExhibitionAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const uid = Number(formData.get("uid"));
  const input = await buildInput(formData, str(formData, "existingImage1"));
  const result = await updateExhibition(uid, input);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/exhibitions/${uid}/edit`);
  return {};
}

export async function addExhibitionGoodsAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const euid = Number(formData.get("euid"));
  const goodsUid = Number(formData.get("goodsUid"));
  const result = await addExhibitionGoods(euid, goodsUid);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/exhibitions/${euid}/edit`);
  return {};
}

export async function removeExhibitionGoodsAction(formData: FormData): Promise<void> {
  const uid = Number(formData.get("uid"));
  const euid = Number(formData.get("euid"));
  await removeExhibitionGoods(uid);
  revalidatePath(`/exhibitions/${euid}/edit`);
}
