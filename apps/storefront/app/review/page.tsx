import Link from "next/link";
import { getReviewList } from "@shoppingmall/core";

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const result = await getReviewList(Number(pageParam ?? 1) || 1);

  return (
    <div id="contents">
      <h2 className="contentTitle">구매후기</h2>
      <div className="empty30" />
      {result.items.length === 0 ? <div className="emptyList">등록된 구매후기가 없습니다.</div> : (
        <ul>
          {result.items.map((review) => (
            <li key={review.uid} style={{ borderBottom: "1px solid #eee", padding: "14px 0" }}>
              <Link href={`/goods/${review.goodsUid}`} className="underLine">{review.goodsName}</Link>
              <div aria-label={`별점 ${review.stars}점`}>{"★".repeat(review.stars)}{"☆".repeat(5 - review.stars)}</div>
              <div>{review.content}</div>
              {review.files.map((filename) => <a key={filename} href={`/uploads/review/${review.uid}/${filename}`} target="_blank" rel="noreferrer">첨부파일</a>)}
              <div className="colorGray size12">{review.authorName} · {new Date(review.signdate * 1000).toLocaleDateString("ko-KR")}</div>
            </li>
          ))}
        </ul>
      )}
      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, index) => index + 1).map((page) => (
            <Link key={page} href={`/review?page=${page}`} style={{ marginRight: 8, fontWeight: page === result.page ? "bold" : "normal" }}>{page}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
