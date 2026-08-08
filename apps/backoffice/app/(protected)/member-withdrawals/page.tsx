import { getMemberWithdrawalList } from "@shoppingmall/core";
import { deleteWithdrawalAction } from "./actions";

export default async function MemberWithdrawalsPage({ searchParams }: { searchParams: Promise<{ keyword?: string; dateFrom?: string; dateTo?: string; page?: string }> }) {
  const params = await searchParams;
  const result = await getMemberWithdrawalList(params, Number(params.page) || 1);
  return <div><h1 style={{ fontSize: 20 }}>탈퇴회원 내역</h1><form method="get" style={{ display: "flex", gap: 8, margin: "16px 0" }}><input name="keyword" defaultValue={params.keyword} placeholder="아이디/이름/사유/내용" /><input type="date" name="dateFrom" defaultValue={params.dateFrom} /><input type="date" name="dateTo" defaultValue={params.dateTo} /><button>조회</button></form><p>총 {result.total}건</p><table style={{ width: "100%" }}><thead><tr><th>아이디</th><th>이름</th><th>주문수</th><th>탈퇴사유</th><th>상세내용</th><th>접속</th><th>탈퇴일</th><th>처리</th></tr></thead><tbody>{result.items.map((item) => <tr key={item.uid}><td>{item.id}</td><td>{item.name}</td><td>{item.orderCount}</td><td>{item.reason}</td><td>{item.message}</td><td>{item.mobile ? "모바일" : "PC"}</td><td>{new Date(item.signdate * 1000).toLocaleString("ko-KR")}</td><td><form action={deleteWithdrawalAction}><input type="hidden" name="uid" value={item.uid} /><button>이력삭제</button></form></td></tr>)}</tbody></table></div>;
}
