import { redirect } from "next/navigation";
import { getPostList } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";

function formatDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString("ko-KR");
}

// Port of php/my_counsel.php — my own 1:1 문의 posts (board=counsel, id=my_id).
export default async function MyCounselPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login?redirect_to=/my_counsel");

  const { page: pageParam } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const result = await getPostList("counsel", { page, authorId: session.userId, viewerId: session.userId });

  return (
    <div id="contents">
      <h2 className="contentTitle">내가 쓴 1:1 문의</h2>
      <div className="empty20" />
      {result.items.length === 0 ? (
        <div className="emptyList">작성한 1:1 문의가 없습니다.</div>
      ) : (
        <ul>
          {result.items.map((post) => (
            <li key={post.uid} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
              <a href={`/board/counsel/${post.uid}`} className="underLine">
                {post.locked ? "🔒 비밀글입니다" : post.subject}
              </a>
              <span className="size12 colorGray"> {formatDate(post.signdate)}</span>
            </li>
          ))}
        </ul>
      )}
      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/my_counsel?page=${p}`} style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
