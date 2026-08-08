import { notFound } from "next/navigation";
import { getAdminAddPageDetail } from "@shoppingmall/core";
import { AddPageForm } from "@/components/AddPageForm";

export default async function EditAddPagePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid: uidParam } = await params;
  const uid = Number(uidParam);
  if (!Number.isInteger(uid)) notFound();

  const page = await getAdminAddPageDetail(uid);
  if (!page) notFound();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>정적페이지 수정 — {page.title}</h1>
      <AddPageForm initial={page} />
    </div>
  );
}
