import { getAdminInquiryList } from "@shoppingmall/core";
import { answerInquiryAction, deleteInquiryAction } from "./actions";

export default async function InquiryAdminPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const result = await getAdminInquiryList(Number(pageParam ?? 1) || 1);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>상품문의 관리</h1>
      {result.items.map((item) => (
        <section key={item.uid} style={{ borderBottom: "1px solid #ddd", padding: "16px 0" }}>
          <strong>{item.goodsName} — {item.subject}</strong>
          <div style={{ color: "#777", fontSize: 12 }}>{item.authorName} / {new Date(item.signdate * 1000).toLocaleString("ko-KR")}</div>
          <p>{item.content}</p>
          <form action={answerInquiryAction}>
            <input type="hidden" name="uid" value={item.uid} />
            <textarea name="answer" required defaultValue={item.answer ?? ""} rows={3} style={{ width: "80%" }} />
            <button type="submit">답변 저장</button>
          </form>
          <form action={deleteInquiryAction} style={{ marginTop: 6 }}>
            <input type="hidden" name="uid" value={item.uid} />
            <button type="submit">삭제</button>
          </form>
        </section>
      ))}
      {result.items.length === 0 && <p>등록된 상품문의가 없습니다.</p>}
    </div>
  );
}
