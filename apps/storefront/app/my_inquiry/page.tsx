import { redirect } from "next/navigation";
import { getMyInquiries } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";

// Port of php/my_inquiry.php. Every row here is always viewable regardless
// of `secret` — the list is already scoped to `id = my_id`, i.e. the viewer
// is always the author.
export default async function MyInquiryPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect_to=/my_inquiry");

  const inquiries = await getMyInquiries(session.userId);

  return (
    <div id="contents">
      <h2 className="contentTitle">상품문의내역</h2>
      <div className="empty30" />
      {inquiries.length === 0 ? (
        <div className="emptyList">등록된 상품문의가 없습니다.</div>
      ) : (
        <ul>
          {inquiries.map((inquiry) => (
            <li key={inquiry.uid} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
              <div>
                {inquiry.secret && <i className="xi-lock size12" />}{" "}
                <a href={`/goods/${inquiry.goodsUid}`} className="underLine">
                  {inquiry.goodsName}
                </a>{" "}
                — {inquiry.subject}
                <span className="colorGray size12">{inquiry.answered ? " · 답변완료" : " · 답변대기중"}</span>
              </div>
              <div className="empty10" />
              <div>{inquiry.content}</div>
              {inquiry.answered && <div style={{ background: "#f7f7f7", padding: 10, marginTop: 6 }}>{inquiry.answer}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
