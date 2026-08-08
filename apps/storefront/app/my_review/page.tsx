import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyReviews } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";

export default async function MyReviewPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect_to=/my_review");
  const reviews = await getMyReviews(session.userId);

  return (
    <div id="contents">
      <h2 className="contentTitle">나의 구매후기</h2>
      <div className="empty30" />
      {reviews.length === 0 ? <div className="emptyList">작성한 구매후기가 없습니다.</div> : (
        <ul>
          {reviews.map((review) => (
            <li key={review.uid} style={{ borderBottom: "1px solid #eee", padding: "14px 0" }}>
              <Link href={`/goods/${review.goodsUid}`} className="underLine">{review.goodsName}</Link>
              <div>{"★".repeat(review.stars)}{"☆".repeat(5 - review.stars)}</div>
              <div>{review.content}</div>
              {review.files.map((filename) => <a key={filename} href={`/uploads/review/${review.uid}/${filename}`} target="_blank" rel="noreferrer">첨부파일</a>)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
