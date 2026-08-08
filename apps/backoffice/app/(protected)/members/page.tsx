import { getAdminMemberList } from "@shoppingmall/core";
import { MemberLevelForm } from "@/components/MemberLevelForm";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ page?: string; keyword?: string }> }) {
  const { page: pageParam, keyword } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const result = await getAdminMemberList({ keyword }, page);

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>회원관리</h1>

      <form method="get" style={{ marginBottom: 16 }}>
        <input type="text" name="keyword" placeholder="아이디/이름/이메일/연락처" defaultValue={keyword} />
        <button type="submit">검색</button>
      </form>

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
