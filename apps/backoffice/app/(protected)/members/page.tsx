import { getAdminMemberList } from "@shoppingmall/core";
import { MemberLevelForm } from "@/components/MemberLevelForm";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ page?: string; keyword?: string }> }) {
  const { page: pageParam, keyword } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const result = await getAdminMemberList({ keyword }, page);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>회원관리</h1>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <form method="get" style={{ display: "flex", gap: 8 }}>
          <input type="text" name="keyword" placeholder="아이디/이름/이메일/연락처" defaultValue={keyword} />
          <button type="submit">검색</button>
        </form>
        <a href={`/members/export?${new URLSearchParams(keyword ? { keyword } : {}).toString()}`}>
          <button type="button">엑셀 다운로드</button>
        </a>
      </div>

      <MemberLevelForm members={result.items} />

      {result.totalPages > 1 && (
        <div className="empty20">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <a key={p} href={`/members?page=${p}`} style={{ marginRight: 8, fontWeight: p === result.page ? "bold" : "normal" }}>
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
