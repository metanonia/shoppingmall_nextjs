import { getReviewList } from "@shoppingmall/core";
import { deleteReviewAction, setReviewBestAction } from "./actions";

export default async function ReviewAdminPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const result = await getReviewList(Number(pageParam ?? 1) || 1, 20);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>구매후기 관리</h1>
      <table style={{ width: "100%" }}>
        <thead><tr><th>상품</th><th>작성자</th><th>별점</th><th>내용</th><th>베스트</th><th /></tr></thead>
        <tbody>
          {result.items.map((item) => (
            <tr key={item.uid}>
              <td>{item.goodsName}</td><td>{item.authorName}</td><td>{item.stars}</td><td>{item.content}</td>
              <td>
                <form action={setReviewBestAction}>
                  <input type="hidden" name="uid" value={item.uid} />
                  <input type="hidden" name="best" value={item.best ? "0" : "1"} />
                  <button type="submit">{item.best ? "해제" : "선정"}</button>
                </form>
              </td>
              <td><form action={deleteReviewAction}><input type="hidden" name="uid" value={item.uid} /><button type="submit">삭제</button></form></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
