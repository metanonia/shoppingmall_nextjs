"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAddPage, deleteAddPage, setAddPageImages, updateAddPage, type AddPageFormInput } from "@shoppingmall/core";
import { saveImage } from "@/lib/image-upload";
import { requireAdmin } from "@/lib/auth";

export type ActionState = { error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function parseInput(formData: FormData): AddPageFormInput {
  return {
    title: str(formData, "title"),
    detailImageOnly: formData.get("detailImageOnly") === "on",
    detailImageType: Number(formData.get("detailImageType")) === 2 ? 2 : 1,
    explains: str(formData, "explains"),
    status: Number(formData.get("status") ?? 0) || 0,
  };
}

async function uploadImages(uid: number, formData: FormData, existing: string[]): Promise<{ ok: true; filenames: string[] } | { ok: false; error: string }> {
  const files = formData.getAll("detailImages").filter((f): f is File => f instanceof File && f.size > 0);
  const uploaded: string[] = [];
  for (const file of files) {
    const result = await saveImage("add_page", file, uid);
    if (!result.ok) return { ok: false, error: result.error };
    uploaded.push(result.filename);
  }
  return { ok: true, filenames: [...existing, ...uploaded] };
}

export async function createAddPageAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const created = await createAddPage(parseInput(formData));
  if (!created.ok) return { error: created.error };

  const images = await uploadImages(created.uid, formData, []);
  if (!images.ok) return { error: images.error };
  if (images.filenames.length > 0) await setAddPageImages(created.uid, images.filenames);

  redirect("/pages");
}

export async function updateAddPageAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const uid = Number(formData.get("uid"));
  const result = await updateAddPage(uid, parseInput(formData));
  if (!result.ok) return { error: result.error };

  const existing = formData.getAll("existingDetailImages").map(String);
  const images = await uploadImages(uid, formData, existing);
  if (!images.ok) return { error: images.error };
  await setAddPageImages(uid, images.filenames);

  redirect("/pages");
}

export async function deleteAddPageAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const uid = Number(formData.get("uid"));
  await deleteAddPage(uid);
  revalidatePath("/pages");
}
