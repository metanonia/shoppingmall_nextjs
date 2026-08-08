"use server";

import { revalidatePath } from "next/cache";
import { getShopConfig, updateGoodsIconInfo } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";
import { removeGoodsIcon, saveGoodsIcon } from "@/lib/goods-icon-upload";

function refresh() {
  revalidatePath("/settings/goods");
  revalidatePath("/goods/new");
}

export async function uploadGoodsIconsAction(formData: FormData) {
  await requireAdmin();
  const files = formData.getAll("icons").filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length) return;
  const config = await getShopConfig();
  const names = [...config.goodsIconInfo];
  for (const file of files) {
    const result = await saveGoodsIcon(file);
    if (!result.ok) throw new Error(result.error);
    names.push(result.filename);
  }
  await updateGoodsIconInfo(names);
  refresh();
}

export async function replaceGoodsIconAction(formData: FormData) {
  await requireAdmin();
  const oldName = String(formData.get("name") ?? "");
  const file = formData.get("icon");
  const config = await getShopConfig();
  if (!config.goodsIconInfo.includes(oldName) || !(file instanceof File) || file.size === 0) return;
  const result = await saveGoodsIcon(file, oldName);
  if (!result.ok) throw new Error(result.error);
  await updateGoodsIconInfo(config.goodsIconInfo.map((name) => name === oldName ? result.filename : name));
  refresh();
}

export async function deleteGoodsIconAction(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "");
  const config = await getShopConfig();
  if (!config.goodsIconInfo.includes(name) || !(await removeGoodsIcon(name))) return;
  await updateGoodsIconInfo(config.goodsIconInfo.filter((icon) => icon !== name));
  refresh();
}

export async function reorderGoodsIconsAction(formData: FormData) {
  await requireAdmin();
  const config = await getShopConfig();
  const requested = String(formData.get("order") ?? "").split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
  if (requested.length !== config.goodsIconInfo.length || new Set(requested).size !== requested.length || requested.some((name) => !config.goodsIconInfo.includes(name))) throw new Error("아이콘 순서 값이 올바르지 않습니다.");
  await updateGoodsIconInfo(requested);
  refresh();
}
