import { notFound } from "next/navigation";
import { getPostComments, getPostDetail } from "@shoppingmall/core";
import { ReplyForm } from "@/components/ReplyForm";

export default async function VendorCounselAdminDetailPage({ params }: { params: Promise<{ uid: string }> }) {
  const uid = Number((await params).uid);
  if (!Number.isInteger(uid)) notFound();
  const detail = await getPostDetail("vcounsel", uid, null, { incrementView: false, bypassSecret: true });
  if (!detail) notFound();
  const comments = await getPostComments(uid);
  return <div><h1 style={{ fontSize: 20 }}>{detail.subject}</h1><div style={{ color: "#999" }}>{detail.authorName}</div><div style={{ whiteSpace: "pre-wrap", margin: "20px 0" }}>{detail.content}</div>{comments.map((comment) => <div key={comment.uid} style={{ borderTop: "1px solid #eee", padding: 10 }}>{comment.content}</div>)}<ReplyForm postUid={uid} boardId="vcounsel" /></div>;
}
