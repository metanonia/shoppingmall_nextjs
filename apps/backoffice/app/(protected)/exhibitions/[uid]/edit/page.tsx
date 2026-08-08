import { notFound } from "next/navigation";
import { getAdminExhibitionDetail } from "@shoppingmall/core";
import { ExhibitionForm } from "@/components/ExhibitionForm";
import { ExhibitionGoodsPanel } from "@/components/ExhibitionGoodsPanel";

export default async function EditExhibitionPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid: uidParam } = await params;
  const uid = Number(uidParam);
  if (!Number.isInteger(uid)) notFound();

  const exhibition = await getAdminExhibitionDetail(uid);
  if (!exhibition) notFound();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>기획전 수정 — {exhibition.name}</h1>
      <ExhibitionForm initial={exhibition} />
      <div className="empty30" />
      <ExhibitionGoodsPanel euid={uid} goods={exhibition.goods} />
    </div>
  );
}
