"use client";

import { useActionState } from "react";
import type { ShopConfig, AgreementPages } from "@shoppingmall/core";
import {
  updateAgreementAction,
  updateBasicConfigAction,
  updateDeliveryConfigAction,
  updatePaymentConfigAction,
  type ActionState,
} from "@/app/(protected)/settings/actions";

function SavedNotice({ state }: { state: ActionState }) {
  if (state.error) return <div style={{ color: "#e02020", fontSize: 12 }}>{state.error}</div>;
  if (state.success) return <div style={{ color: "#2a8f2a", fontSize: 12 }}>저장되었습니다.</div>;
  return null;
}

export function BasicConfigForm({ config }: { config: ShopConfig }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateBasicConfigAction, {});
  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 480 }}>
      <input type="text" name="basicName" placeholder="쇼핑몰명" defaultValue={config.basicName} />
      <input type="text" name="basicTitle" placeholder="사이트 타이틀" defaultValue={config.basicTitle} />
      <input type="text" name="basicDescription" placeholder="사이트 설명" defaultValue={config.basicDescription} />
      <input type="text" name="basicKeyword" placeholder="키워드" defaultValue={config.basicKeyword} />
      <input type="text" name="basicUrl" placeholder="사이트 URL" defaultValue={config.basicUrl} />
      <input type="text" name="basicAdmin" placeholder="관리자명" defaultValue={config.basicAdmin} />
      <input type="text" name="basicEmail" placeholder="대표 이메일" defaultValue={config.basicEmail} />
      <input type="text" name="compName" placeholder="상호명" defaultValue={config.compName} />
      <input type="text" name="compOwner" placeholder="대표자명" defaultValue={config.compOwner} />
      <input type="text" name="compTel" placeholder="대표 전화번호" defaultValue={config.compTel} />
      <input type="text" name="compFax" placeholder="팩스번호" defaultValue={config.compFax} />
      <input type="text" name="compAddress1" placeholder="주소" defaultValue={config.compAddress1} />
      <input type="text" name="compAddress2" placeholder="상세주소" defaultValue={config.compAddress2} />
      <div style={{ display: "flex", gap: 8 }}>
        <input type="text" name="csTime1" placeholder="평일 운영시간" defaultValue={config.csTime1} />
        <input type="text" name="csTime2" placeholder="토요일" defaultValue={config.csTime2} />
        <input type="text" name="csTime3" placeholder="일요일/공휴일" defaultValue={config.csTime3} />
        <input type="text" name="csTime4" placeholder="점심시간" defaultValue={config.csTime4} />
      </div>
      <SavedNotice state={state} />
      <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
        저장
      </button>
    </form>
  );
}

export function DeliveryConfigForm({ config }: { config: ShopConfig }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateDeliveryConfigAction, {});
  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400 }}>
      <select name="deliveryType" defaultValue={config.deliveryType}>
        <option value="F">무료배송</option>
        <option value="D">착불</option>
        <option value="P">조건부 무료(기준금액 이상 무료)</option>
      </select>
      <input type="number" name="deliveryDPrice" placeholder="착불 기본 배송비" defaultValue={config.deliveryDPrice} />
      <input type="number" name="deliveryPPrice1" placeholder="무료배송 기준금액" defaultValue={config.deliveryPPrice1} />
      <input type="number" name="deliveryPPrice2" placeholder="기준금액 미만 배송비" defaultValue={config.deliveryPPrice2} />
      <SavedNotice state={state} />
      <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
        저장
      </button>
    </form>
  );
}

export function PaymentConfigForm({ config }: { config: ShopConfig }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updatePaymentConfigAction, {});
  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 480 }}>
      <label>
        <input type="checkbox" name="paymentTypeB" defaultChecked={config.paymentTypeB === 1} /> 무통장입금 사용
      </label>
      <label>
        <input type="checkbox" name="paymentTypeC" defaultChecked={config.paymentTypeC === 1} /> 카드결제 사용
      </label>
      <label>
        <input type="checkbox" name="paymentTypeH" defaultChecked={config.paymentTypeH === 1} /> 휴대폰결제 사용
      </label>
      <textarea name="paymentBankInfo" placeholder="무통장입금 계좌안내" defaultValue={config.paymentBankInfo} rows={3} />
      <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
        PG 자격증명이 비어있으면 Mock 결제(테스트용)로 자동 폴백됩니다.
      </div>
      <input type="text" name="paymentCp" placeholder="PG사 코드(예: ARONHUB)" defaultValue={config.paymentCp} />
      <input type="text" name="paymentShopId" placeholder="가맹점 ID" defaultValue={config.paymentShopId} />
      <input type="text" name="paymentShopKey" placeholder="가맹점 키" defaultValue={config.paymentShopKey} />
      <SavedNotice state={state} />
      <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
        저장
      </button>
    </form>
  );
}

export function AgreementConfigForm({ agreements }: { agreements: AgreementPages }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateAgreementAction, {});
  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 600 }}>
      <label>
        이용약관 ({"{SYEAR}"}/{"{SMONTH}"}/{"{SDAY}"}/{"{SHOPNAME}"}/{"{COMPANY}"} 치환 가능)
        <textarea name="terms" defaultValue={agreements.terms} rows={10} style={{ width: "100%" }} />
      </label>
      <label>
        개인정보처리방침 ({"{COMPANY}"}/{"{MANAGERNAME}"}/{"{MANAGERTEL}"}/{"{MANAGEREMAIL}"} 치환 가능)
        <textarea name="privacy" defaultValue={agreements.privacy} rows={10} style={{ width: "100%" }} />
      </label>
      <SavedNotice state={state} />
      <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
        저장
      </button>
    </form>
  );
}
