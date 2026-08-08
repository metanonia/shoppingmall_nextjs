import { prisma } from "@shoppingmall/db";
import type { Device } from "./device";

function now(): number {
  return Math.floor(Date.now() / 1000);
}

export type BannerFormInput = {
  name: string;
  code: string;
  image1: string;
  link1: string;
  status: number;
  target: number;
  sDate: Date | null;
  eDate: Date | null;
  sequence: number;
};

function toBannerData(input: BannerFormInput) {
  return {
    name: input.name,
    code: input.code,
    image1: input.image1,
    link1: input.link1,
    status: input.status,
    target: input.target,
    s_date: input.sDate,
    e_date: input.eDate,
    sequence: input.sequence,
  };
}

export type DesignAdminResult = { ok: true; uid: number } | { ok: false; error: string };

// Banner/MobileBanner are structurally identical but distinct Prisma
// delegate types (same reason popup.ts's getActivePopups branches
// explicitly on device rather than picking a dynamic delegate).
export async function createBanner(device: Device, input: BannerFormInput): Promise<DesignAdminResult> {
  if (!input.name.trim()) return { ok: false, error: "배너명을 입력해 주세요." };
  const data = { ...toBannerData(input), moddate: now(), signdate: now() };
  const created = device === "mobile" ? await prisma.mobileBanner.create({ data }) : await prisma.banner.create({ data });
  return { ok: true, uid: created.uid };
}

export async function updateBanner(device: Device, uid: number, input: BannerFormInput): Promise<DesignAdminResult> {
  if (!input.name.trim()) return { ok: false, error: "배너명을 입력해 주세요." };
  const data = { ...toBannerData(input), moddate: now() };
  const updated =
    device === "mobile"
      ? await prisma.mobileBanner.updateMany({ where: { uid }, data })
      : await prisma.banner.updateMany({ where: { uid }, data });
  if (updated.count === 0) return { ok: false, error: "존재하지 않는 배너입니다." };
  return { ok: true, uid };
}

export async function deleteBanner(device: Device, uid: number): Promise<void> {
  if (device === "mobile") await prisma.mobileBanner.deleteMany({ where: { uid } });
  else await prisma.banner.deleteMany({ where: { uid } });
}

export type AdminBannerItem = { uid: number; name: string; code: string; image1: string; status: number; sequence: number };

export async function getAdminBannerList(device: Device): Promise<AdminBannerItem[]> {
  const rows =
    device === "mobile"
      ? await prisma.mobileBanner.findMany({ orderBy: [{ code: "asc" }, { sequence: "asc" }] })
      : await prisma.banner.findMany({ orderBy: [{ code: "asc" }, { sequence: "asc" }] });
  return rows.map((r) => ({ uid: r.uid, name: r.name, code: r.code, image1: r.image1, status: r.status, sequence: r.sequence }));
}

export type AdminBannerDetail = BannerFormInput & { uid: number };

export async function getAdminBannerDetail(device: Device, uid: number): Promise<AdminBannerDetail | null> {
  const row = device === "mobile" ? await prisma.mobileBanner.findFirst({ where: { uid } }) : await prisma.banner.findFirst({ where: { uid } });
  if (!row) return null;
  return {
    uid: row.uid,
    name: row.name,
    code: row.code,
    image1: row.image1,
    link1: row.link1,
    status: row.status,
    target: row.target,
    sDate: row.s_date,
    eDate: row.e_date,
    sequence: row.sequence,
  };
}

export type PopupFormInput = {
  name: string;
  status: number;
  type: number;
  period: number;
  sDate: Date | null;
  eDate: Date | null;
  position: number;
  inputPosition: string;
  inputSize: string;
  imageOnly: boolean;
  image1: string;
  link1: string;
  content: string;
};

function toPopupData(input: PopupFormInput) {
  return {
    name: input.name,
    status: input.status,
    type: input.type,
    period: input.period,
    s_date: input.sDate,
    e_date: input.eDate,
    position: input.position,
    input_position: input.inputPosition,
    input_size: input.inputSize,
    image_only: input.imageOnly ? 1 : 0,
    image1: input.image1,
    link1: input.link1,
    content: input.content,
  };
}

export async function createPopup(device: Device, input: PopupFormInput): Promise<DesignAdminResult> {
  if (!input.name.trim()) return { ok: false, error: "팝업명을 입력해 주세요." };
  const data = { ...toPopupData(input), signdate: now() };
  const created = device === "mobile" ? await prisma.mobilePopup.create({ data }) : await prisma.popup.create({ data });
  return { ok: true, uid: created.uid };
}

export async function updatePopup(device: Device, uid: number, input: PopupFormInput): Promise<DesignAdminResult> {
  if (!input.name.trim()) return { ok: false, error: "팝업명을 입력해 주세요." };
  const data = toPopupData(input);
  const updated =
    device === "mobile" ? await prisma.mobilePopup.updateMany({ where: { uid }, data }) : await prisma.popup.updateMany({ where: { uid }, data });
  if (updated.count === 0) return { ok: false, error: "존재하지 않는 팝업입니다." };
  return { ok: true, uid };
}

export async function deletePopup(device: Device, uid: number): Promise<void> {
  if (device === "mobile") await prisma.mobilePopup.deleteMany({ where: { uid } });
  else await prisma.popup.deleteMany({ where: { uid } });
}

export type AdminPopupItem = { uid: number; name: string; status: number; position: number };

export async function getAdminPopupList(device: Device): Promise<AdminPopupItem[]> {
  const rows = device === "mobile" ? await prisma.mobilePopup.findMany({ orderBy: { uid: "desc" } }) : await prisma.popup.findMany({ orderBy: { uid: "desc" } });
  return rows.map((r) => ({ uid: r.uid, name: r.name, status: r.status, position: r.position }));
}

export type AdminPopupDetail = PopupFormInput & { uid: number };

export async function getAdminPopupDetail(device: Device, uid: number): Promise<AdminPopupDetail | null> {
  const row = device === "mobile" ? await prisma.mobilePopup.findFirst({ where: { uid } }) : await prisma.popup.findFirst({ where: { uid } });
  if (!row) return null;
  return {
    uid: row.uid,
    name: row.name,
    status: row.status,
    type: row.type,
    period: row.period,
    sDate: row.s_date,
    eDate: row.e_date,
    position: row.position,
    inputPosition: row.input_position,
    inputSize: row.input_size,
    imageOnly: row.image_only === 1,
    image1: row.image1,
    link1: row.link1,
    content: row.content,
  };
}
