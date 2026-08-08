# 결제사 선정 후 결제 어댑터 구현 가이드

## 1. 적용 기준

이 쇼핑몰은 신규 설치 후 결제사를 선정한다. 따라서 현재 단계의 완료 조건은 특정 PG사의
운영 연동이 아니라, 결제사 선정 뒤 기존 주문 도메인을 바꾸지 않고 어댑터를 추가할 수
있도록 구현 지점과 검증 절차가 문서화되어 있는 것이다.

현재 `MOCK` 결제는 개발·회귀 테스트용이며 운영 결제수단이 아니다. 운영 전에는 선정된
PG 어댑터를 연결하고, 운영 환경에서 `MOCK`로 자동 대체되지 않도록 차단해야 한다.

## 2. 현재 구조와 변경 지점

| 역할 | 파일 |
|---|---|
| 공통 계약, Mock, 어댑터 선택 | `packages/core/src/payment.ts` |
| 기존 form-post 구현 예시 | `packages/core/src/payment-aronhub.ts` |
| 결제 요청 화면 | `apps/storefront/app/order/pay/page.tsx` |
| 기존 callback 예시 | `apps/storefront/app/api/payment/aronhub/callback/route.ts` |
| 기존 사용자 return 예시 | `apps/storefront/app/api/payment/aronhub/return/route.ts` |
| 결제 확정과 중복·금액 검증 | `packages/core/src/order.ts`의 `confirmPgPayment` |
| 전체 취소 연결 | `packages/core/src/order.ts`의 `orderStatus95` |
| 부분 환불 장부 처리 | `packages/core/src/order.ts`의 `partialRefundOrder` |
| 현금영수증 요청 장부 | `packages/core/src/cash-receipt.ts` |
| 회귀 테스트 예시 | `packages/core/src/payment.test.ts`, `payment-aronhub.test.ts` |

`PaymentGateway`의 표준 결제 결과에는 적어도 주문번호, PG 거래번호, 결제금액, 결제수단,
승인시각, 성공 여부가 포함되어야 한다. PG 응답 원문은 비밀값을 제거한 후 감사 로그에
남길 수 있어야 한다.

## 3. 어댑터 구현 순서

### 3.1 공통 계약 구현

1. `packages/core/src/payment-<provider>.ts`를 만든다.
2. `PaymentGateway`를 구현한다.
   - `createPaymentRequest`: 결제창에 필요한 endpoint와 서명된 필드를 생성한다.
   - `parseCallback`: callback 값을 공통 결제 결과로 변환하고 서명을 검증한다.
   - `cancelPayment`: 전액 취소 API를 호출하고 PG 거래번호를 반환한다.
3. 조회·승인 API 호출처럼 비동기 검증이 필요한 PG라면 동기 `parseCallback`에 억지로
   넣지 않는다. provider 전용 `approve/verify` 함수를 callback route에서 호출한 뒤
   검증된 공통 결과만 `confirmPgPayment`에 전달한다.
4. `packages/core/src/payment.ts`의 `PaymentGateway.code` 타입과
   `getPaymentGateway()` 선택 분기를 새 provider로 확장한다.

환경변수에는 상점 ID, secret/key, API URL, 결제창 URL을 분리한다. 서버 secret은
`NEXT_PUBLIC_*`에 두거나 브라우저 컴포넌트로 전달하지 않는다. 개발·시험·운영 자격증명과
endpoint도 각각 분리한다.

### 3.2 결제 요청 화면 연결

`apps/storefront/app/order/pay/page.tsx`의 Aronhub 전용 callback/return 경로를 provider
설정에서 생성하도록 바꾼다. 주문번호와 금액은 브라우저 입력을 신뢰하지 말고 서버의
임시주문을 다시 읽어 결제 요청을 만든다. 결제수단 코드는 쇼핑몰의 `C/H/R/V`와 PG사의
코드를 어댑터 내부에서 매핑한다.

### 3.3 callback, webhook, return 연결

선정 PG용 API route를 만들고 다음 순서로 처리한다.

1. HTTP method, content type, source IP 정책 등 PG 명세의 수신 조건을 확인한다.
2. 상점 ID, signature/MAC, timestamp 또는 nonce를 검증한다.
3. 필요하면 PG 승인·거래조회 API를 서버에서 호출한다.
4. DB의 주문번호와 결제금액이 PG 결과와 일치하는지 확인한다.
5. 검증된 결과만 `confirmPgPayment`에 넘긴다. 이 함수의 중복 callback 방지와 주문 상태,
   재고·쿠폰·마일리지 처리를 우회하지 않는다.
6. PG가 정한 시간 안에 성공/실패 응답을 반환하고, 재시도되어도 같은 결과가 되도록 한다.

브라우저 return URL은 결과 표시와 상태 재조회에만 사용한다. return 요청만으로 결제를
확정하면 안 된다. 가상계좌는 입금·취소·만료 webhook을 각각 주문 상태에 연결한다.

### 3.4 취소와 부분 취소

- 전액 취소는 `orderStatus95`가 PG `cancelPayment` 성공을 확인한 후 재고·쿠폰·마일리지와
  내부 주문 상태를 복원하는 현재 순서를 유지한다.
- PG 장애나 불명확한 응답에서 내부 상태만 취소로 바꾸지 않는다. 거래조회 또는 관리자
  재처리 대상으로 남기고 오류 원문과 요청 ID를 기록한다.
- 선정 PG가 부분 취소를 지원하면 `cancelPartialPayment` 계약을 추가한다. PG 부분 취소가
  성공한 뒤에만 `partialRefundOrder`로 내부 환불액과 상품 상태를 반영한다.
- 동일 취소의 재호출을 막기 위해 주문번호, PG 거래번호, 취소 요청 ID, 금액을 멱등키와
  감사 로그로 보관한다.

### 3.5 현금영수증

PG가 현금영수증 API를 제공하면 발급, 취소, 상태조회 메서드를 어댑터에 추가한다.
`OrderCashReceipt`의 신청 정보와 관리자 처리 화면을 유지하면서 PG 승인번호, 발급시각,
취소시각, 실패사유를 저장한다. 실시간계좌이체·가상계좌 입금 확정 뒤 발급하며 주문 취소
또는 환불 시 PG 취소 결과와 내부 상태를 함께 갱신한다.

## 4. 필수 테스트

운영 활성화 전에 PG sandbox와 실제 MySQL로 아래 시나리오를 자동 또는 수동 검증한다.

- 카드·휴대폰·실시간계좌이체·가상계좌별 정상 결제와 사용자 결제창 이탈
- 잘못된 signature, 상점 ID, 주문번호, 금액 불일치의 거부
- 같은 callback/webhook의 중복·순서 역전·지연 수신
- 승인 성공 후 callback 유실 시 거래조회 기반 복구
- 전액 취소, 부분 취소, 중복 취소, PG 장애 중 취소 재처리
- 가상계좌 입금·부분입금·만료·입금취소 상태 전이
- 현금영수증 발급·실패·취소와 관리자 재처리
- 결제 후 재고, 쿠폰, 마일리지, 주문상태, 알림의 일관성
- PC와 모바일 결제창 및 return 화면

## 5. 운영 전 체크리스트

- [ ] 결제사와 계약한 수단만 관리자 설정에 노출했다.
- [ ] sandbox와 production 키·URL을 분리하고 secret을 서버에서만 사용한다.
- [ ] production에서 `MOCK` fallback을 차단했다.
- [ ] callback/webhook 서명, 금액, 주문, 멱등성을 서버에서 검증한다.
- [ ] 전액·부분 취소와 현금영수증을 실제 계약 범위에 맞게 연결했다.
- [ ] PG 거래조회와 내부 주문을 대조하는 reconciliation 및 재처리 절차가 있다.
- [ ] 성공·실패·지연·중복·취소 시나리오의 증적을 보관했다.
- [ ] 개인정보와 카드정보를 저장하거나 로그에 출력하지 않는지 확인했다.

이 체크리스트는 결제사 선정 후 실제 결제를 운영에 활성화하기 위한 조건이다. 결제사
선정 전인 현재 마이그레이션의 완료 여부와는 분리해 관리한다.
