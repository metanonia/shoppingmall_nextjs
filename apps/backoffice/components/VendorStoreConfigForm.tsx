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

      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>스토어 페이지 진열</legend>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
          내 스토어 페이지 상단에 노출할 섹션입니다. 진열 상품은 상품관리 &gt; 스토어 진열관리에서 지정합니다.
        </div>
        {[
          { name: "displayBest", label: "인기상품", defaultValue: config?.displayBest ?? 0 },
          { name: "displayReco", label: "추천상품", defaultValue: config?.displayReco ?? 0 },
          { name: "displayNew", label: "신상품", defaultValue: config?.displayNew ?? 0 },
        ].map((f) => (
          <div key={f.name} style={{ marginTop: 6 }}>
            <label style={{ marginRight: 8 }}>{f.label}</label>
            <select name={f.name} defaultValue={f.defaultValue}>
              <option value={0}>사용 안 함</option>
              <option value={1}>기본형</option>
              <option value={2}>큰 이미지형</option>
              <option value={3}>그룹형</option>
            </select>
          </div>
        ))}
      </fieldset>

      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>상품 등록 시 추천값</legend>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
          한 줄에 하나씩 입력하면 상품등록 화면의 브랜드/제조사/원산지 입력창에서 자동완성으로
          제안됩니다(자유 입력은 그대로 가능).
        </div>
        <textarea name="brandInfo" placeholder="브랜드(줄바꿈으로 구분)" defaultValue={config?.brandInfo.join("\n")} rows={3} style={{ width: "100%" }} />
        <textarea name="makeInfo" placeholder="제조사(줄바꿈으로 구분)" defaultValue={config?.makeInfo.join("\n")} rows={3} style={{ width: "100%", marginTop: 6 }} />
        <textarea
          name="originInfo"
          placeholder="원산지(줄바꿈으로 구분)"
          defaultValue={config?.originInfo.join("\n")}
          rows={3}
          style={{ width: "100%", marginTop: 6 }}
        />
      </fieldset>

      {state.error && <div style={{ color: "#e02020" }}>{state.error}</div>}
      {state.success && <div style={{ color: "#2a8" }}>저장되었습니다.</div>}
      <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
        {pending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
