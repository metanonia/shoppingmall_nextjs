"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createPopup, deletePopup, updatePopup, type PopupFormInput } from "@shoppingmall/core";
import type { Device } from "@shoppingmall/core";
import { saveImage } from "@/lib/image-upload";
import { requireAdmin } from "@/lib/auth";

export type ActionState = { error?: string };

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function toDevice(formData: FormData): Device {
  return formData.get("device") === "mobile" ? "mobile" : "pc";
}

function parseInput(formData: FormData, image1: string): PopupFormInput {
  const sDateStr = str(formData, "sDate");
  const eDateStr = str(formData, "eDate");
  const top = str(formData, "posTop");
  const left = str(formData, "posLeft");
  const width = str(formData, "width");
  const height = str(formData, "height");

  return {
    name: str(formData, "name"),
    status: Number(formData.get("status") ?? 0) || 0,
    type: Number(formData.get("type") ?? 0) || 0,
    period: formData.get("period") === "on" ? 1 : 0,
    sDate: sDateStr ? new Date(sDateStr) : null,
    eDate: eDateStr ? new Date(eDateStr) : null,
    position: Number(formData.get("position") ?? 0) || 0,
    inputPosition: `${top}|${left}`,
    inputSize: `${width}|${height}`,
    imageOnly: formData.get("imageOnly") === "on",
    image1,
    link1: str(formData, "link1"),
    content: str(formData, "content"),
  };
}

// Same per-uid subfolder / create-then-upload-then-update shape as
// banners.ts actions — popup.ts's read path is /image/{popup|mobile_popup}/{uid}/{filename}.
export async function createPopupAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const device = toDevice(formData);
  const created = await createPopup(device, parseInput(formData, ""));
  if (!created.ok) return { error: created.error };

  const file = formData.get("image1");
  if (file instanceof File && file.size > 0) {
    const folder = device === "mobile" ? "mobile_popup" : "popup";
    const uploaded = await saveImage(folder, file, created.uid);
    if (!uploaded.ok) return { error: uploaded.error };
    await updatePopup(device, created.uid, parseInput(formData, uploaded.filename));
  }

  redirect(`/popups?device=${device}`);
}

export async function updatePopupAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const device = toDevice(formData);
  const uid = Number(formData.get("uid"));

  let image1 = str(formData, "existingImage1");
  const file = formData.get("image1");
  if (file instanceof File && file.size > 0) {
    const folder = device === "mobile" ? "mobile_popup" : "popup";
    const uploaded = await saveImage(folder, file, uid);
    if (!uploaded.ok) return { error: uploaded.error };
    image1 = uploaded.filename;
  }

  const result = await updatePopup(device, uid, parseInput(formData, image1));
  if (!result.ok) return { error: result.error };
  redirect(`/popups?device=${device}`);
}

export async function deletePopupAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const device = toDevice(formData);
  const uid = Number(formData.get("uid"));
  await deletePopup(device, uid);
  revalidatePath("/popups");
  redirect(`/popups?device=${device}`);
}
