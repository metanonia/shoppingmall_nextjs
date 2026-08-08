"use client";

import { useActionState } from "react";
import type { ShopConfig, AgreementPages, MemberFormConfig, SocialConfigItem } from "@shoppingmall/core";
import {
  updateAgreementAction,
  updateBasicConfigAction,
  updateDeliveryConfigAction,
  updateGoodsConfigAction,
  updateMemberConfigAction,
  updatePaymentConfigAction,
  type ActionState,
} from "@/app/(protected)/settings/actions";

const SOCIAL_LABELS: Record<string, string> = { NAVER: "네이버", KAKAO: "카카오", GOOGLE: "구글", PAYCO: "페이코" };

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
      <fieldset style={{ border: "1px solid #eee", padding: 12 }}>
        <legend>주문 자동처리(0=사용안함)</legend>
        <label>배송중 자동완료 <input type="number" min={0} name="orderAutoCompleted1" defaultValue={config.orderAutoCompleted1} />일 후</label>
        <label>배송완료 자동구매확정 <input type="number" min={0} name="orderAutoCompleted2" defaultValue={config.orderAutoCompleted2} />일 후</label>
        <label>종료 주문 자동정리 <input type="number" min={0} name="orderAutoCompleted3" defaultValue={config.orderAutoCompleted3} />일 후</label>
      </fieldset>
      <fieldset style={{ border: "1px solid #eee", padding: 12 }}>
        <legend>스마트 배송추적</legend>
        <label><input type="checkbox" name="orderTrackerEnabled" defaultChecked={config.orderTrackerEnabled} /> 사용</label>
        <input type="password" name="orderTrackerKey" placeholder="SweetTracker API key" defaultValue={config.orderTrackerKey} style={{ width: "100%" }} />
      </fieldset>
      <textarea name="orderCancelInfo" placeholder="주문취소 사유 목록" defaultValue={config.orderCancelInfo} rows={3} />
      <textarea name="orderMessageInfo" placeholder="배송 요청사항 목록" defaultValue={config.orderMessageInfo} rows={3} />
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
      <label><input type="checkbox" name="paymentTypeR" defaultChecked={config.paymentTypeR === 1} /> 실시간계좌이체 사용</label>
      <label><input type="checkbox" name="paymentTypeV" defaultChecked={config.paymentTypeV === 1} /> 가상계좌 사용</label>
      <textarea name="paymentBankInfo" placeholder="무통장입금 계좌안내" defaultValue={config.paymentBankInfo} rows={3} />
      <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
        PG 자격증명이 비어있으면 Mock 결제(테스트용)로 자동 폴백됩니다.
      </div>
      <input type="text" name="paymentCp" placeholder="PG사 코드(예: ARONHUB)" defaultValue={config.paymentCp} />
      <input type="text" name="paymentShopId" placeholder="가맹점 ID" defaultValue={config.paymentShopId} />
      <input type="text" name="paymentShopKey" placeholder="가맹점 키" defaultValue={config.paymentShopKey} />
      <fieldset><legend>현금영수증</legend>
        <label><input type="checkbox" name="cashReceiptsUsed" defaultChecked={config.cashReceiptsUsed} /> 사용</label>
        <label><input type="checkbox" name="cashReceiptsRequired" defaultChecked={config.cashReceiptsRequired} /> 주문 시 필수</label>
        <select name="cashReceiptsMethod" defaultValue={config.cashReceiptsMethod}><option value={0}>관리자 수동발급</option><option value={1}>PG 자동발급</option></select>
        <select name="cashReceiptsType" defaultValue={config.cashReceiptsType}><option value={0}>과세</option><option value={1}>면세</option></select>
      </fieldset>
      <fieldset style={{ display: "grid", gap: 6 }}><legend>네이버페이</legend>
        <label><input type="checkbox" name="naverPayUsed" defaultChecked={config.naverPayUsed} /> 사용</label>
        <label>서버 <select name="naverPayMode" defaultValue={config.naverPayMode}><option value={0}>테스트</option><option value={1}>운영</option></select></label>
        <input name="naverPayTestId" placeholder="검수용 네이버 ID" defaultValue={config.naverPayTestId} />
        <input name="naverPayShopId" placeholder="네이버페이 상점 ID" defaultValue={config.naverPayShopId} />
        <input name="naverPayCertKey" type="password" placeholder="가맹점 인증키" defaultValue={config.naverPayCertKey} />
        <input name="naverPayButtonKey" placeholder="버튼 인증키" defaultValue={config.naverPayButtonKey} />
        <input name="naverPayCommonKey" type="password" placeholder="네이버 공통 인증키" defaultValue={config.naverPayCommonKey} />
      </fieldset>
      <SavedNotice state={state} />
      <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
        저장
      </button>
    </form>
  );
}

const REQUIRED_LABELS: Record<0 | 1 | 2, string> = { 0: "사용 안 함", 1: "선택 입력", 2: "필수 입력" };

export function MemberConfigForm({ config, socialConfigs }: { config: MemberFormConfig; socialConfigs: SocialConfigItem[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateMemberConfigAction, {});
  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 520 }}>
      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>가입 항목</legend>
        {(
          [
            ["telRequired", "전화번호", config.telRequired],
            ["cellRequired", "휴대폰번호", config.cellRequired],
            ["addressRequired", "주소", config.addressRequired],
            ["birthRequired", "생년월일", config.birthRequired],
            ["genderRequired", "성별", config.genderRequired],
            ["marryRequired", "결혼여부", config.marryRequired],
            ["jobRequired", "직업", config.jobRequired],
            ["hobbyRequired", "관심분야", config.hobbyRequired],
            ["compRequired", "회사명", config.compRequired],
            ["compNumRequired", "사업자등록번호", config.compNumRequired],
            ["compOwnerRequired", "대표자명", config.compOwnerRequired],
            ["compAddressRequired", "사업자주소", config.compAddressRequired],
            ["compTypeRequired", "업태", config.compTypeRequired],
            ["compItemRequired", "종목", config.compItemRequired],
          ] as const
        ).map(([name, label, value]) => (
          <div key={name} style={{ marginBottom: 6 }}>
            <label style={{ marginRight: 8 }}>{label}</label>
            <select name={name} defaultValue={value}>
              {([0, 1, 2] as const).map((v) => (
                <option key={v} value={v}>
                  {REQUIRED_LABELS[v]}
                </option>
              ))}
            </select>
          </div>
        ))}
        <input name="jobOptions" defaultValue={config.jobOptions.join("|")} placeholder="직업 선택값 (| 구분)" />
        <input name="hobbyOptions" defaultValue={config.hobbyOptions.join("|")} placeholder="관심분야 선택값 (| 구분)" />
        {config.customFields.map((field, index) => (
          <div key={field.key} style={{ display: "flex", gap: 6 }}>
            <input name={`add${index + 1}Title`} defaultValue={field.title} placeholder={`추가항목 ${index + 1} 제목`} />
            <select name={`add${index + 1}Required`} defaultValue={field.required}>
              {([0, 1, 2] as const).map((value) => <option key={value} value={value}>{REQUIRED_LABELS[value]}</option>)}
            </select>
          </div>
        ))}
        <label style={{ display: "block" }}>
          <input type="checkbox" name="maillingEnabled" defaultChecked={config.maillingEnabled} /> 이메일 수신동의 항목 표시
        </label>
        <label style={{ display: "block" }}>
          <input type="checkbox" name="smsEnabled" defaultChecked={config.smsEnabled} /> SMS 수신동의 항목 표시
        </label>
      </fieldset>

      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>마일리지 정책</legend>
        <label><input type="checkbox" name="mileageEnabled" defaultChecked={config.mileageEnabled} /> 마일리지 사용</label>
        <label style={{ display: "block", marginTop: 6 }}>가입 지급 <input type="number" min={0} name="joinMileage" defaultValue={config.joinMileage} />P</label>
        <label style={{ display: "block", marginTop: 6 }}>환경설정 상품 구매 적립률 <input type="number" min={0} step="0.01" name="orderMileage" defaultValue={config.orderMileage} />%</label>
      </fieldset>

      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>가입 승인</legend>
        <label>
          <input type="checkbox" name="memberAuthAuto" defaultChecked={config.memberAuthAuto} /> 자동 승인(체크 해제 시 관리자 수동승인 필요)
        </label>
      </fieldset>

      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>로그인 제한</legend>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="number" name="loginLimitCount" placeholder="실패 허용 횟수(0=제한없음)" defaultValue={config.loginLimitCount} />
          <input type="number" name="loginLimitMinutes" placeholder="제한 시간(분)" defaultValue={config.loginLimitMinutes} />
        </div>
      </fieldset>

      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>소셜 로그인</legend>
        {socialConfigs.map((s) => (
          <div key={s.site} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <label style={{ width: 60 }}>
              <input type="checkbox" name={`social_${s.site}_used`} defaultChecked={s.used} /> {SOCIAL_LABELS[s.site]}
            </label>
            <input type="text" name={`social_${s.site}_apiId`} placeholder="Client ID" defaultValue={s.apiId} style={{ flex: 1 }} />
            <input type="text" name={`social_${s.site}_apiKey`} placeholder="Client Secret" defaultValue={s.apiKey} style={{ flex: 1 }} />
          </div>
        ))}
      </fieldset>

      <SavedNotice state={state} />
      <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
        저장
      </button>
    </form>
  );
}

export function GoodsConfigForm({ config }: { config: ShopConfig }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateGoodsConfigAction, {});
  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 480 }}>
      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>가격 제한</legend>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="number" name="priceLimit1" placeholder="최소 판매가" defaultValue={config.goodsPriceLimit1} />
          <input type="number" name="priceLimit2" placeholder="최대 판매가" defaultValue={config.goodsPriceLimit2} />
        </div>
      </fieldset>

      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>품절상품 노출</legend>
        <label><input type="radio" name="goodsSoldout" value={0} defaultChecked={config.goodsSoldout === 0} /> 그대로 노출</label>{" "}
        <label><input type="radio" name="goodsSoldout" value={1} defaultChecked={config.goodsSoldout === 1} /> 목록 마지막에 노출</label>{" "}
        <label><input type="radio" name="goodsSoldout" value={2} defaultChecked={config.goodsSoldout === 2} /> 노출하지 않음</label>
      </fieldset>

      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>쇼핑 검색 노출</legend>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
          체크하면 각 채널의 상품 피드(<code>/feed/naver</code>, <code>/feed/daum</code>)가 열립니다.
          상품별로는 상품등록 화면의 &quot;쇼핑 검색 노출&quot; 항목으로 제외할 수 있습니다.
        </div>
        <label style={{ marginRight: 16 }}>
          <input type="checkbox" name="engineNaver" defaultChecked={config.goodsEngineNaver} /> 네이버 쇼핑
        </label>
        <label>
          <input type="checkbox" name="engineDaum" defaultChecked={config.goodsEngineDaum} /> 다음(카카오) 쇼핑
        </label>
      </fieldset>

      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>상품 입력 마스터값</legend>
        <textarea name="optionInfo" placeholder="옵션명(줄바꿈 구분)" defaultValue={config.goodsOptionInfo.join("\n")} rows={3} style={{ width: "100%" }} />
        <textarea name="brandInfo" placeholder="브랜드(줄바꿈 구분)" defaultValue={config.goodsBrandInfo.join("\n")} rows={3} style={{ width: "100%", marginTop: 6 }} />
        <textarea name="makeInfo" placeholder="제조사(줄바꿈 구분)" defaultValue={config.goodsMakeInfo.join("\n")} rows={3} style={{ width: "100%", marginTop: 6 }} />
        <textarea name="originInfo" placeholder="원산지(줄바꿈 구분)" defaultValue={config.goodsOriginInfo.join("\n")} rows={3} style={{ width: "100%", marginTop: 6 }} />
        <textarea name="requireInfo" placeholder="상품정보제공고시 기본값" defaultValue={config.goodsRequireInfo} rows={5} style={{ width: "100%", marginTop: 6 }} />
        <input type="hidden" name="iconInfo" value={config.goodsIconInfo.join("\n")} />
        <p style={{ color: "#777", marginTop: 6 }}>아이콘 파일은 아래의 상품 아이콘 파일 관리에서 등록합니다.</p>
      </fieldset>

      <fieldset style={{ border: "1px solid #eee", padding: 12, borderRadius: 6 }}>
        <legend>상품 기본 안내문구(직영 상품 공통)</legend>
        <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
          상품등록 시 &quot;환경설정 사용&quot;으로 지정한 직영(입점사 없음) 상품에 공통 적용됩니다.
          입점사 상품은 각 입점사의 스토어설정을 따릅니다.
        </div>
        <textarea name="deliveryInfo" placeholder="배송 안내" defaultValue={config.goodsDeliveryInfo} rows={3} style={{ width: "100%" }} />
        <textarea name="refundInfo" placeholder="환불 안내" defaultValue={config.goodsRefundInfo} rows={3} style={{ width: "100%", marginTop: 6 }} />
        <textarea name="exchangeInfo" placeholder="교환 안내" defaultValue={config.goodsExchangeInfo} rows={3} style={{ width: "100%", marginTop: 6 }} />
        <textarea name="asInfo" placeholder="AS 안내" defaultValue={config.goodsAsInfo} rows={3} style={{ width: "100%", marginTop: 6 }} />
      </fieldset>

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
