import { getOrderChanges } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";
import { vendorProcessOrderChangeAction } from "./actions";

const TYPE: Record<number, string> = { 7: "교환", 8: "반품", 9: "취소" };
const STEP: Record<number, string> = { 1: "요청", 2: "승인/처리중", 3: "회수완료", 4: "교환발송", 5: "완료", 9: "거절" };

export default async function VendorOrderChangesPage() {
  const session = await requireVendor();
  const rows = await getOrderChanges({ vendorId: session.vendorId ?? "" });
  return <div><h1 style={{ fontSize: 20 }}>교환·반품 접수</h1><table style={{ width: "100%", marginTop: 16 }}><thead><tr><th>주문/상품</th><th>고객</th><th>종류</th><th>사유</th><th>상태</th><th>처리</th></tr></thead><tbody>{rows.map((row) => <tr key={row.uid}><td><a href={`/vendor/orders/${row.order_num}`}>{row.order_num}</a><br />#{row.og_uid}</td><td>{row.name}</td><td>{TYPE[row.status]}</td><td>{row.reason}<br />{row.message}</td><td>{STEP[row.status2]}</td><td>{![5, 9].includes(row.status2) && <form action={vendorProcessOrderChangeAction} style={{ display: "flex", gap: 4, flexWrap: "wrap" }}><input type="hidden" name="uid" value={row.uid} />{row.status2 === 1 && <button name="status2" value={2}>승인</button>}{row.status2 === 2 && <button name="status2" value={3}>회수완료</button>}{row.status === 7 && row.status2 === 3 && <><input name="carrier" placeholder="택배사" required /><input name="trackingNumber" placeholder="송장번호" required /><button name="status2" value={4}>교환발송</button></>}<button name="status2" value={9}>거절</button></form>}</td></tr>)}</tbody></table></div>;
}
