import { getCashReceiptList } from "@shoppingmall/core";
import { deleteCashReceiptAction, updateCashReceiptAction } from "./actions";

const STATUS: Record<number, string> = { 0: "발급요청", 1: "발급거절", 2: "발급실패", 3: "발급완료", 4: "발급취소" };

export default async function CashReceiptsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const result = await getCashReceiptList(Number((await searchParams).page ?? 1) || 1);
  return <div><h1 style={{ fontSize: 20 }}>현금영수증 관리</h1><table style={{ width: "100%" }}><thead><tr><th>주문번호</th><th>신청자</th><th>금액</th><th>용도/번호</th><th>상태</th><th>처리</th></tr></thead><tbody>{result.items.map((item) => <tr key={item.uid}><td>{item.order_num}</td><td>{item.name}</td><td>{item.price.toLocaleString()}원</td><td>{item.cash_type ? "지출증빙" : "소득공제"} {item.auth_number}</td><td>{STATUS[item.status] ?? item.status}</td><td><form action={updateCashReceiptAction}><input type="hidden" name="uid" value={item.uid} /><select name="status" defaultValue={item.status || 3}><option value={1}>거절</option><option value={2}>실패</option><option value={3}>완료</option><option value={4}>취소</option></select><input name="info" placeholder="승인/처리정보" defaultValue={item.receipt_info} /><button>저장</button></form><form action={deleteCashReceiptAction}><input type="hidden" name="uid" value={item.uid} /><button>삭제</button></form></td></tr>)}</tbody></table></div>;
}
