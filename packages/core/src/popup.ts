import { prisma } from "@shoppingmall/db";
import type { Device } from "./device";

export type PopupItem = {
  uid: number;
  name: string;
  type: number; // 0 always, 1 once-per-day (dismiss-for-today cookie)
  position: number; // desktop 0(직접입력)-9, mobile 0(중앙)-1(하단)
  posTop: string | null;
  posLeft: string | null;
  width: string | null;
  height: string | null;
  imageOnly: boolean;
  imageUrl: string | null;
  link: string | null;
  contentHtml: string | null;
  slides: { uid: number; name: string; imageUrl: string; link: string | null; dismissForToday: boolean }[];
};

function toPopupItem(
  row: {
    uid: number;
    name: string;
    type: number;
    position: number;
    input_position: string;
    input_size: string;
    image_only: number;
    image1: string;
    link1: string;
    content: string;
  },
  device: Device,
): PopupItem {
  const [posTop, posLeft] = row.input_position.split("|");
  const [width, height] = row.input_size.split("|");
  const folder = device === "mobile" ? "mobile_popup" : "popup";
  const item = {
    uid: row.uid,
    name: row.name,
    type: row.type,
    position: row.position,
    posTop: row.position === 0 ? posTop || null : null,
    posLeft: row.position === 0 ? posLeft || null : null,
    width: width || null,
    height: height || null,
    imageOnly: row.image_only === 1,
    imageUrl: row.image_only === 1 && row.image1 ? `/image/${folder}/${row.uid}/${row.image1}` : null,
    link: row.link1 || null,
    contentHtml: row.image_only === 1 ? null : row.content,
    slides: [] as PopupItem["slides"],
  };
  if (item.imageOnly && item.imageUrl) item.slides.push({ uid: item.uid, name: item.name, imageUrl: item.imageUrl, link: item.link, dismissForToday: item.type === 1 });
  return item;
}

// Port of php/bottom.php:116-206's popup-selection loop. Image-only popups
// sharing a position are merged into one slider; HTML popups keep the first
// box at that position, matching the legacy position grouping.
export async function getActivePopups(device: Device, dismissedUids: number[]): Promise<PopupItem[]> {
  // prisma.popup / prisma.mobilePopup are structurally identical but
  // distinct delegate types — TS can't unify a variable holding either, so
  // this branches explicitly instead of picking a dynamic delegate.
  const rows =
    device === "mobile"
      ? await prisma.mobilePopup.findMany({ where: { status: 0 }, orderBy: [{ position: "asc" }, { uid: "asc" }] })
      : await prisma.popup.findMany({ where: { status: 0 }, orderBy: [{ position: "asc" }, { uid: "asc" }] });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const seenPositions = new Set<number>();
  const active: PopupItem[] = [];

  for (const row of rows) {
    if (row.period === 1) {
      if (row.s_date && row.s_date > today) continue;
      if (row.e_date && row.e_date < today) {
        if (device === "mobile") await prisma.mobilePopup.update({ where: { uid: row.uid }, data: { status: 2 } });
        else await prisma.popup.update({ where: { uid: row.uid }, data: { status: 2 } });
        continue;
      }
    }
    if (row.type === 1 && dismissedUids.includes(row.uid)) continue;
    const item = toPopupItem(row, device);
    if (seenPositions.has(row.position)) {
      const group = active.find((popup) => popup.position === row.position);
      if (group?.imageOnly && item.imageOnly) group.slides.push(...item.slides);
      continue;
    }
    seenPositions.add(row.position);
    active.push(item);
  }
  return active;
}
