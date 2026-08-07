import { prisma } from "@shoppingmall/db";
import type { Device } from "./device";

export type BannerItem = {
  uid: number;
  name: string;
  link: string;
  target: boolean;
  imageUrl: string;
};

// Port of lib/lib.Shop.php:881 commonBannerCheck($channel), scoped to the banner
// codes the Home page vertical slice actually renders (skin_define.php's
// $BANNER_DEFINE / $MOBILE_BANNER_DEFINE define the full placement config —
// admin-managed banner layout beyond LOGO/TOPL/MAINT/MAINCL/MAINCR is a
// managers/design/banner_*.php concern for the admin-backend phase).
async function fetchBanners(code: string, device: Device, limit?: number): Promise<BannerItem[]> {
  const folder = device === "mobile" ? "mobile_banner" : "banner";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows =
    device === "mobile"
      ? await prisma.mobileBanner.findMany({
          where: { code, status: 0 },
          orderBy: { sequence: "asc" },
          take: limit,
        })
      : await prisma.banner.findMany({
          where: { code, status: 0 },
          orderBy: { sequence: "asc" },
          take: limit,
        });

  return rows
    .filter((row) => {
      const alwaysStarted = row.s_date?.toISOString().slice(0, 10) === "1000-01-01";
      const alwaysEnded = row.e_date?.toISOString().slice(0, 10) === "1000-01-01";
      if (!alwaysStarted && row.s_date && row.s_date > today) return false;
      if (!alwaysEnded && row.e_date && row.e_date < today) return false;
      return true;
    })
    .map((row) => ({
      uid: row.uid,
      name: row.name,
      link: row.link1 || "#",
      target: row.target === 1,
      imageUrl: `/image/${folder}/${row.uid}/${row.image1}`,
    }));
}

export async function getTopBanners(device: Device) {
  const codes = device === "mobile" ? ["LOGO"] : ["LOGO", "TOPL"];
  const entries = await Promise.all(codes.map((code) => fetchBanners(code, device)));
  return Object.fromEntries(codes.map((code, i) => [code, entries[i]])) as Record<string, BannerItem[]>;
}

export async function getMainBanners(device: Device) {
  const codes = device === "mobile" ? ["MAINT"] : ["MAINT", "MAINCL", "MAINCR"];
  const entries = await Promise.all(codes.map((code) => fetchBanners(code, device)));
  return Object.fromEntries(codes.map((code, i) => [code, entries[i]])) as Record<string, BannerItem[]>;
}
