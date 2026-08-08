import { notFound } from "next/navigation";
import { getPostComments, getPostDetail } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";

export default async function VendorBoardDetailPage({ params }: { params: Promise<{ boardId: string; uid: string }> }) {
  const { boardId, uid: rawUid } = await params;
  if (boardId !== "vnotice" && boardId !== "vcounsel") notFound();
  const session = await requireVendor();
  const uid = Number(rawUid);
  const detail = await getPostDetail(boardId, uid, { memberId: session.vendorId ?? session.userId }, { incrementView: true });
  if (!detail || !detail.viewable) notFound();
  const comments = boardId === "vcounsel" ? await getPostComments(uid) : [];
  return <div><h1 style={{ fontSize: 20 }}>{detail.subject}</h1><div style={{ whiteSpace: "pre-wrap", margin: "20px 0" }}>{detail.content}</div>{comments.map((comment) => <div key={comment.uid} style={{ borderTop: "1px solid #eee", padding: 12 }}><b>본사 답변</b><div>{comment.content}</div></div>)}</div>;
}
