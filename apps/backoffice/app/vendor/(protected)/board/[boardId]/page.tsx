import { notFound } from "next/navigation";
import Link from "next/link";
import { BOARD_CONFIG, getPostList } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";

export default async function VendorBoardListPage({ params, searchParams }: { params: Promise<{ boardId: string }>; searchParams: Promise<{ page?: string }> }) {
  const { boardId } = await params;
  if (boardId !== "vnotice" && boardId !== "vcounsel") notFound();
  const session = await requireVendor();
  const page = Number((await searchParams).page ?? 1) || 1;
  const result = await getPostList(boardId, { page, ...(boardId === "vcounsel" ? { authorId: session.vendorId ?? session.userId } : {}) });
  return <div>
    <h1 style={{ fontSize: 20 }}>{BOARD_CONFIG[boardId].name}</h1>
    {boardId === "vcounsel" && <p><Link href="/vendor/board/vcounsel/write">문의 작성</Link></p>}
    <table style={{ width: "100%" }}><thead><tr><th>제목</th><th>작성일</th><th>답변</th></tr></thead><tbody>
      {result.items.map((item) => <tr key={item.uid}><td><Link href={`/vendor/board/${boardId}/${item.uid}`}>{item.subject}</Link></td><td>{new Date(item.signdate * 1000).toLocaleDateString("ko-KR")}</td><td>{boardId === "vcounsel" ? (item.commentCount ? "답변완료" : "미답변") : ""}</td></tr>)}
    </tbody></table>
  </div>;
}
