import { notFound } from "next/navigation";
import { getAdminPopupDetail } from "@shoppingmall/core";
import { PopupForm } from "@/components/PopupForm";

export default async function EditPopupPage({
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

  const popup = await getAdminPopupDetail(device, uid);
  if (!popup) notFound();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>팝업 수정 — {popup.name}</h1>
      <PopupForm device={device} initial={popup} />
    </div>
  );
}
