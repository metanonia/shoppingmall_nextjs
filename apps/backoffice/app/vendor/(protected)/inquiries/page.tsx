import { getVendorInquiryList } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";
import { VendorInquiryAnswerForm } from "@/components/VendorInquiryAnswerForm";

export default async function VendorInquiriesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await requireVendor();
  const page = Number((await searchParams).page ?? 1) || 1;
  const result = await getVendorInquiryList(session.vendorId ?? session.userId, page);
  return <div><h1 style={{ fontSize: 20 }}>상품문의</h1>{result.items.map((item) => <section key={item.uid} style={{ borderBottom: "1px solid #eee", padding: "16px 0" }}><b>{item.goodsName} · {item.subject}</b><div style={{ whiteSpace: "pre-wrap" }}>{item.content}</div><VendorInquiryAnswerForm uid={item.uid} initial={item.answer} /></section>)}</div>;
}
