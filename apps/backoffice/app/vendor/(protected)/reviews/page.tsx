import { getVendorReviewList } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";

export default async function VendorReviewsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await requireVendor();
  const page = Number((await searchParams).page ?? 1) || 1;
  const result = await getVendorReviewList(session.vendorId ?? "", page);
  return <div><h1 style={{ fontSize: 20 }}>구매후기</h1><p>총 {result.total}건</p><table style={{ width: "100%" }}><thead><tr><th>상품</th><th>작성자</th><th>별점</th><th>내용</th><th>작성일</th></tr></thead><tbody>{result.items.map((item) => <tr key={item.uid}><td>{item.goodsName}</td><td>{item.authorName}</td><td>{item.stars}</td><td>{item.content}</td><td>{new Date(item.signdate * 1000).toLocaleDateString("ko-KR")}</td></tr>)}</tbody></table>{result.totalPages > 1 && <div>{Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => <a key={p} href={`/vendor/reviews?page=${p}`} style={{ marginRight: 8 }}>{p}</a>)}</div>}</div>;
}
