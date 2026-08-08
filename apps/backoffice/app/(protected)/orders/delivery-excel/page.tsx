import Link from "next/link";
import { DeliveryExcelForm } from "@/components/DeliveryExcelForm";

export default function DeliveryExcelPage() {
  return <div><h1 style={{ fontSize: 20 }}>송장번호 일괄 등록</h1><p style={{ margin: "16px 0" }}>결제완료·배송준비중인 본사배송 상품을 내려받아 송장번호 열을 작성한 뒤 업로드하세요.</p><p style={{ marginBottom: 20 }}><Link href="/orders/delivery-excel/download">송장번호 일괄 등록용 엑셀 다운로드</Link></p><DeliveryExcelForm /></div>;
}
