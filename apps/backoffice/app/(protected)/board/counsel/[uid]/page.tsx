import { notFound } from "next/navigation";
import { getPostComments, getPostDetail } from "@shoppingmall/core";
import { ReplyForm } from "@/components/ReplyForm";

function formatDate(signdate: number): string {
  return new Date(signdate * 1000).toLocaleString("ko-KR");
}

export default async function CounselDetailAdminPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid: uidParam } = await params;
  const uid = Number(uidParam);
  if (!Number.isInteger(uid)) notFound();

  const detail = await getPostDetail("counsel", uid, null, { incrementView: false, bypassSecret: true });
  if (!detail) notFound();
  const comments = await getPostComments(uid);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>{detail.subject}</h1>
      <div style={{ color: "#999", fontSize: 12, marginBottom: 20 }}>
        {detail.authorName} · {formatDate(detail.signdate)} · 연락처 {detail.contact}
      </div>
      <div style={{ whiteSpace: "pre-wrap", marginBottom: 24 }}>{detail.content}</div>

      <h3 style={{ fontSize: 16 }}>답변</h3>
      <ul style={{ marginBottom: 12 }}>
        {comments.map((c) => (
          <li key={c.uid} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
            <div style={{ color: "#999", fontSize: 12 }}>{formatDate(c.signdate)}</div>
            <div>{c.content}</div>
          </li>
        ))}
      </ul>
      <ReplyForm postUid={uid} />
    </div>
  );
}
