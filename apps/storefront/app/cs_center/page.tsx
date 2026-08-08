import Link from "next/link";
import { BOARD_CONFIG, getPostList, getShopConfig } from "@shoppingmall/core";

function formatDate(signdate: number): string {
  return new Date(signdate * 1000).toLocaleDateString("ko-KR");
}

// Port of php/cs_center.php — CS hours + FAQ categories + latest 3 notices,
// all from functions that already existed for other screens (getShopConfig,
// BOARD_CONFIG.faq.categories, getPostList) — no new core logic needed.
export default async function CsCenterPage() {
  const [config, notices] = await Promise.all([getShopConfig(), getPostList("notice", { page: 1 })]);
  const latestNotices = notices.items.slice(0, 3);
  const faqCategories = BOARD_CONFIG.faq.categories ?? [];

  return (
    <div id="contents">
      <h2 className="contentTitle">고객센터</h2>

      <div className="empty20" />
      <div className="sub_title">고객센터 운영시간</div>
      <table style={{ width: "100%" }}>
        <tbody>
          <tr>
            <td>평일</td>
            <td>{config.csTime1}</td>
          </tr>
          <tr>
            <td>토요일</td>
            <td>{config.csTime2}</td>
          </tr>
          <tr>
            <td>일/공휴일</td>
            <td>{config.csTime3}</td>
          </tr>
          <tr>
            <td>점심시간</td>
            <td>{config.csTime4}</td>
          </tr>
          <tr>
            <td>전화번호</td>
            <td>{config.compTel}</td>
          </tr>
        </tbody>
      </table>

      <div className="empty30" />
      <div className="sub_title">자주 찾는 질문</div>
      <div>
        {faqCategories.map((name, i) => (
          <Link key={name} href={`/board/faq?category=${i}`} style={{ marginRight: 12 }}>
            {name}
          </Link>
        ))}
      </div>

      <div className="empty30" />
      <div className="sub_title">공지사항</div>
      <ul>
        {latestNotices.map((n) => (
          <li key={n.uid}>
            <Link href={`/board/notice/${n.uid}`}>{n.subject}</Link> <span style={{ color: "#999" }}>{formatDate(n.signdate)}</span>
          </li>
        ))}
      </ul>

      <div className="empty30" />
      <div>
        <Link href="/board/counsel">1:1 문의하기</Link>
      </div>
    </div>
  );
}
