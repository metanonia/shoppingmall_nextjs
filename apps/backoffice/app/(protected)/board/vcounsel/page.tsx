import { getPostList } from "@shoppingmall/core";

export default async function VendorCounselAdminPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Number((await searchParams).page ?? 1) || 1;
  const result = await getPostList("vcounsel", { page });
  return <div><h1 style={{ fontSize: 20 }}>판매사 1:1문의 관리</h1><table style={{ width: "100%" }}><thead><tr><th>제목</th><th>판매사</th><th>작성일</th><th>답변</th></tr></thead><tbody>{result.items.map((item) => <tr key={item.uid}><td><a href={`/board/vcounsel/${item.uid}`}>{item.subject}</a></td><td>{item.authorName}</td><td>{new Date(item.signdate * 1000).toLocaleDateString("ko-KR")}</td><td>{item.commentCount ? "답변완료" : "미답변"}</td></tr>)}</tbody></table></div>;
}
