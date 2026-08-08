import { getMemberSleepList } from "@shoppingmall/core";

function formatDate(unix: number): string {
  return unix > 0 ? new Date(unix * 1000).toLocaleDateString("ko-KR") : "-";
}

export default async function MemberSleepPage({ searchParams }: { searchParams: Promise<{ page?: string; keyword?: string }> }) {
  const { page: pageParam, keyword } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const result = await getMemberSleepList({ keyword }, page);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>휴면회원 관리</h1>
      <form method="get" style={{ marginBottom: 16 }}>
        <input type="text" name="keyword" placeholder="아이디/이름/이메일" defaultValue={keyword} />
        <button type="submit">검색</button>
      </form>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>아이디</th>
            <th>이름</th>
            <th>이메일</th>
            <th>가입일</th>
            <th>휴면전환일</th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((m) => (
            <tr key={m.uid}>
              <td>{m.id}</td>
              <td>{m.name}</td>
              <td>{m.email}</td>
              <td>{formatDate(m.signdate)}</td>
              <td>{formatDate(m.sleepTime)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.items.length === 0 && <div style={{ color: "#999", marginTop: 12 }}>휴면회원이 없습니다.</div>}
      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/member-sleep?page=${p}`} style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
