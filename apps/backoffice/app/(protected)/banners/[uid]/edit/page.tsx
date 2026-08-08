import { notFound } from "next/navigation";
import { getAdminBannerDetail } from "@shoppingmall/core";
import { BannerForm } from "@/components/BannerForm";

export default async function EditBannerPage({
  params,
  searchParams,
}: {
  params: Promise<{ uid: string }>;
  searchParams: Promise<{ device?: string }>;
}) {
  const { uid: uidParam } = await params;
  const { device: deviceParam } = await searchParams;
  const device = deviceParam === "mobile" ? "mobile" : "pc";
  const uid = Number(uidParam);
  if (!Number.isInteger(uid)) notFound();

  const banner = await getAdminBannerDetail(device, uid);
  if (!banner) notFound();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>배너 수정 — {banner.name}</h1>
      <BannerForm device={device} initial={banner} />
    </div>
  );
}
