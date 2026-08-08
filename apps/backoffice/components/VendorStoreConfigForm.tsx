"use client";

import { useActionState } from "react";
import type { VendorConfigurationView } from "@shoppingmall/core";
import { updateVendorConfigurationAction, type ActionState } from "@/app/vendor/(protected)/store/actions";

export function VendorStoreConfigForm({ config }: { config: VendorConfigurationView | null }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateVendorConfigurationAction, {});

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>고객센터 운영시간</legend>
        <input type="text" name="csTime1" placeholder="평일" defaultValue={config?.csTime1} />
        <input type="text" name="csTime2" placeholder="토요일" defaultValue={config?.csTime2} style={{ marginTop: 6 }} />
        <input type="text" name="csTime3" placeholder="일/공휴일" defaultValue={config?.csTime3} style={{ marginTop: 6 }} />
        <input type="text" name="csTime4" placeholder="점심시간" defaultValue={config?.csTime4} style={{ marginTop: 6 }} />
      </fieldset>

      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>반품지 주소</legend>
        <input type="text" name="rtnPostcode" placeholder="우편번호" defaultValue={config?.rtnPostcode} />
        <input type="text" name="rtnAddress1" placeholder="주소" defaultValue={config?.rtnAddress1} style={{ marginTop: 6 }} />
        <input type="text" name="rtnAddress2" placeholder="상세주소" defaultValue={config?.rtnAddress2} style={{ marginTop: 6 }} />
      </fieldset>

      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>상품 기본 안내문구</legend>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
          상품등록 시 &quot;환경설정 사용&quot;으로 지정한 상품에 공통 적용됩니다.
        </div>
        <textarea name="deliveryInfo" placeholder="배송 안내" defaultValue={config?.deliveryInfo} rows={3} style={{ width: "100%" }} />
        <textarea name="refundInfo" placeholder="환불 안내" defaultValue={config?.refundInfo} rows={3} style={{ width: "100%", marginTop: 6 }} />
        <textarea name="exchangeInfo" placeholder="교환 안내" defaultValue={config?.exchangeInfo} rows={3} style={{ width: "100%", marginTop: 6 }} />
        <textarea name="asInfo" placeholder="AS 안내" defaultValue={config?.asInfo} rows={3} style={{ width: "100%", marginTop: 6 }} />
      </fieldset>

      {state.error && <div style={{ color: "#e02020" }}>{state.error}</div>}
      {state.success && <div style={{ color: "#2a8" }}>저장되었습니다.</div>}
      <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
        {pending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
