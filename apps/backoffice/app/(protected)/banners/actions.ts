"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createBanner, deleteBanner, updateBanner, type BannerFormInput } from "@shoppingmall/core";
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

function parseInput(formData: FormData, image1: string): BannerFormInput {
  const sDateStr = str(formData, "sDate");
  const eDateStr = str(formData, "eDate");

  return {
    name: str(formData, "name"),
    code: str(formData, "code"),
    image1,
    link1: str(formData, "link1"),
    status: Number(formData.get("status") ?? 0) || 0,
    target: formData.get("target") === "on" ? 1 : 0,
    sDate: sDateStr ? new Date(sDateStr) : null,
    eDate: eDateStr ? new Date(eDateStr) : null,
    sequence: Number(formData.get("sequence") ?? 0) || 0,
  };
}

// Banner images live under a per-uid subfolder (banners.ts's read path:
// /image/{banner|mobile_banner}/{uid}/{filename}) — the uid doesn't exist
// until the row is created, so a new banner is created first with no image,
// then the upload (now knowing the real uid) is applied with a second
// update. Same two-step shape as board.ts's setPostFiles / add-page.ts's
// setAddPageImages.
export async function createBannerAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const device = toDevice(formData);
  const created = await createBanner(device, parseInput(formData, ""));
  if (!created.ok) return { error: created.error };

  const file = formData.get("image1");
  if (file instanceof File && file.size > 0) {
    const folder = device === "mobile" ? "mobile_banner" : "banner";
    const uploaded = await saveImage(folder, file, created.uid);
    if (!uploaded.ok) return { error: uploaded.error };
    await updateBanner(device, created.uid, parseInput(formData, uploaded.filename));
  }

  redirect(`/banners?device=${device}`);
}

export async function updateBannerAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const device = toDevice(formData);
  const uid = Number(formData.get("uid"));

  let image1 = str(formData, "existingImage1");
  const file = formData.get("image1");
  if (file instanceof File && file.size > 0) {
    const folder = device === "mobile" ? "mobile_banner" : "banner";
    const uploaded = await saveImage(folder, file, uid);
    if (!uploaded.ok) return { error: uploaded.error };
    image1 = uploaded.filename;
  }

  const result = await updateBanner(device, uid, parseInput(formData, image1));
  if (!result.ok) return { error: result.error };
  redirect(`/banners?device=${device}`);
}

export async function deleteBannerAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const device = toDevice(formData);
  const uid = Number(formData.get("uid"));
  await deleteBanner(device, uid);
  revalidatePath("/banners");
  redirect(`/banners?device=${device}`);
}
