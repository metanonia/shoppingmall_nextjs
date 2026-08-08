"use client";

import { useActionState } from "react";
import { answerVendorInquiryAction, type VendorInquiryState } from "@/app/vendor/(protected)/inquiries/actions";

export function VendorInquiryAnswerForm({ uid, initial }: { uid: number; initial: string | null }) {
  const [state, action, pending] = useActionState<VendorInquiryState, FormData>(answerVendorInquiryAction, {});
  return <form action={action}><input type="hidden" name="uid" value={uid} /><textarea name="answer" required defaultValue={initial ?? ""} rows={3} />{state.error && <div style={{ color: "#e02020" }}>{state.error}</div>}{state.success && <div style={{ color: "green" }}>저장되었습니다.</div>}<button disabled={pending} type="submit">답변 저장</button></form>;
}
