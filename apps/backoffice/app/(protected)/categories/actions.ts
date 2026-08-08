"use server";

import { revalidatePath } from "next/cache";
import { createCategory, deleteCategory, updateCategory } from "@shoppingmall/core";

export type ActionState = { error?: string };

export async function createCategoryAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const cateName = String(formData.get("newCateName") ?? "").trim();
  const parentCateRaw = String(formData.get("parentCate") ?? "").trim();

  const result = await createCategory({
    cateName,
    parentCate: parentCateRaw ? BigInt(parentCateRaw) : null,
    accessType: 0,
    accessLevel: "",
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/categories");
  return {};
}

export async function updateCategoryAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const uid = Number(formData.get("uid"));
  const result = await updateCategory(uid, {
    cateName: String(formData.get("cateName") ?? "").trim(),
    used: formData.get("used") === "on",
    accessType: 0,
    accessLevel: "",
    sequence: Number(formData.get("sequence") ?? 0),
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/categories");
  return {};
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const uid = Number(formData.get("uid"));
  await deleteCategory(uid);
  revalidatePath("/categories");
}
