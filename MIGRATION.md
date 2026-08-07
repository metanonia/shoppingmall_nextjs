# PHP → Next.js 16 마이그레이션 현황

이 저장소는 `shoppingmall_php`(레거시 PHP 쇼핑몰)를 Next.js 16으로 화면 픽셀 단위로
이행한 결과물입니다. **신규설치 기준**(기존 운영 데이터 없음)이며, 원본 PHP 저장소와는
물리적으로 분리된 별도 저장소입니다.

다른 작업자가 이 저장소를 이어서 작업하게 될 경우, 아래 내용을 먼저 확인하세요.

## 구조

```
apps/
  storefront/   Next.js 16 — 고객 화면 (PC+모바일)
  backoffice/   관리자+입점사 (아직 착수 전, Phase 7-8)
packages/
  db/           Prisma 스키마(레거시 mallRN_* 테이블을 install_post.php DDL 기준으로
                1:1 이식) + MariaDB 드라이버 어댑터
  core/         비즈니스 로직 포팅 (lib.Shop.php, lib.Function.php 등)
  auth/         세션 쿠키 발급/검증 (프레임워크 비의존)
```

- 원본 PHP 소스는 `../shoppingmall_php`에 있으며, 포팅 시 항상 그쪽의 실제 파일/라인을
  기준으로 작업했습니다(각 함수/컴포넌트 주석에 `Port of php/xxx.php:라인` 형태로 출처
  표기).
- 레거시 스킨 CSS(`skin/seriesWhite/css/*.css`)는 손으로 재번역하지 않고 그대로
  `apps/storefront/public/skin/css/`에 복사해서 재사용합니다 — 픽셀 오차의 가장 큰
  원인(수동 클래스 번역)을 원천 차단하기 위한 결정입니다.
- 로컬 개발 DB: `docker-compose.yml`의 `shoppingmall-nextjs-mysql` 컨테이너
  (호스트 포트 3307 — 다른 프로젝트의 MySQL과 충돌 방지).

## 빠르게 시작하기

```bash
docker compose up -d                        # MySQL 기동 (호스트 3307)
pnpm install
cd packages/db && node prisma/seed.js       # 개발용 시드 데이터 (기존 데이터 삭제 후 재삽입)
cd ../../apps/storefront && pnpm dev        # http://localhost:3000
```

- `apps/storefront/.env.local`에 `DATABASE_URL`, `AUTH_SECRET`가 필요합니다(레포에는
  커밋되어 있지 않음 — 없으면 각자 새로 생성: `AUTH_SECRET`은 임의의 긴 랜덤 문자열,
  `DATABASE_URL`은 `mysql://root:root@localhost:3307/shoppingmall`).
- 관리자 계정: 시드에는 실제 로그인 가능한 관리자 회원이 없습니다 — `/regist`로
  가입하면 기본적으로 `level=1`(일반회원)로 생성됩니다. 관리자 기능 자체는 Phase 7
  전까지 없으므로 지금은 상관없습니다.
- Playwright로 스크린샷 검증할 때는 설치된 `playwright` npm 패키지가 기대하는
  브라우저 리비전과 실제 캐시된 빌드가 다를 수 있어
  `chromium.launch({ executablePath: '~/Library/Caches/ms-playwright/chromium-1208/...' })`처럼
  캐시된 빌드 경로를 직접 지정해야 할 수 있습니다.

## 진행 상황 (전체 9단계 계획, 상세는 아래 "설계 결정" 참고)

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 기반 구축 + 홈 화면 | ✅ 완료 |
| 2 | 상품 탐색 (목록/검색/베스트/신상/상세/입점사스토어/모음전) | ✅ 완료 |
| 3 | 회원/인증/소셜로그인 + 회원가입 이후 미뤄뒀던 항목 일괄 처리 | ✅ 완료 (소셜로그인은 구조만, 아래 참고) |
| 4 | 카트/주문 엔진 | ✅ 완료 (무통장입금/마일리지결제만, 아래 참고) |
| 5 | 결제/알림 | ✅ 완료 (아론허브 PG만, 이메일+SMS, 아래 참고) |
| 6 | 게시판/CMS | ✅ 완료 (notice/faq/counsel/gallery만, 아래 참고) |
| 7 | 관리자 백엔드 | ⬜ **다음 작업** (미착수) |
| 8 | 입점사 백엔드 | ⬜ 미착수 |
| 9 | 하드닝/정규화/마무리 | ⬜ 미착수 |

커밋 로그가 각 Phase의 실제 작업 내역이니 `git log`로 확인하세요.

## Phase 4 완료 요약 (카트/주문 엔진)

계획 문서: `~/.claude/plans/smooth-finding-ullman.md`. 장바구니 담기 → 주문서 작성 →
주문 완료 → 주문내역 조회/취소까지 전체 파이프라인이 동작합니다. 게스트 체크아웃(주문
비밀번호 기반 조회/취소)도 지원합니다. 상세 스코프 결정과 구현 내역은 아래 "미뤄둔
것 > 카트/주문" 항목 참고. `packages/core/src/cart.ts`/`coupon.ts`/`mileage.ts`/
`order.ts`, `apps/storefront/app/cart/`·`app/order/`·`app/my_order/`가 핵심 코드.

**레거시와 달리 실제 DB 트랜잭션 사용**: 레거시(`lib/lib.Shop.php`)는 BEGIN/COMMIT이
전혀 없이 순차 함수 호출 + 실패 시 수동 보상 로직으로 "롤백"을 흉내내는 구조였습니다.
이 저장소는 `createOrder`/`orderStatus9`/`orderStatus95`를 전부 `prisma.$transaction`
으로 감싸 원자성을 보장합니다 — 재고 차감도 `UPDATE ... WHERE qty >= N` 조건부
갱신으로 동시성 오버셀을 방지합니다(레거시엔 없는 안전장치).

**Playwright E2E로 실제 검증 완료**: 게스트 무통장입금 주문 생성→조회→취소,
회원 마일리지 전액결제 주문 생성(`orderStatus1` 자동 호출)→취소(`orderStatus95`,
마일리지 환급까지 확인) 흐름을 브라우저로 직접 구동해 DB 상태까지 대조 검증했습니다.
이 과정에서 실제 버그 2건을 발견/수정했습니다:
- 시드 데이터에 `payment_type_b`(무통장입금 활성화)가 빠져 있어 결제수단을 아예 선택할
  수 없었음 → `packages/db/prisma/seed.js`에 추가.
- 주문 생성 시 임시 `order_num` 플레이스홀더가 `varchar(32)` 제한을 초과해 매 주문마다
  DB 에러로 깨졌음 → 28자 hex 토큰으로 축소.

## Phase 5 완료 요약 (결제(아론허브 PG)/알림)

계획 문서: `~/.claude/plans/smooth-finding-ullman.md`. 카드(C)/휴대폰(H) 결제가
`PaymentGateway` 인터페이스(`packages/core/src/payment.ts`) 뒤에서 동작하며, 실제
가맹점 자격증명(`Configuration.payment_cp/payment_shop_id/payment_shop_key`)이
없으면 `MockPaymentGateway`로 자동 폴백합니다(레거시 소셜로그인 게이팅과 동일 패턴 —
키가 생기면 코드 변경 없이 `AronhubPaymentGateway`로 전환됨). 주문완료/결제완료 시
이메일(`mailer.ts`)과 SMS(`sms.ts`, coolSMS 스펙 포팅)를 시도하되, SMS는 키가 없으면
`mallRN_sms_list`에 `SKIPPED_NO_CREDENTIALS`로 기록하고 조용히 스킵합니다(예외
없음). 핵심 코드: `packages/core/src/payment.ts`/`payment-aronhub.ts`/`sms.ts`/
`mailer.ts`/`notification.ts`, `apps/storefront/app/api/payment/`,
`apps/storefront/app/order/pay/`, `components/PaymentWidget.tsx`. 상세 스코프
결정과 구현 내역은 아래 "미뤄둔 것 > 결제(PG)/알림" 항목 참고.

**Playwright E2E로 실제 검증 완료**(Mock PG 사용): 게스트 카드결제 주문 생성→PC 팝업
결제→`confirmPgPayment`(CAS 멱등 처리 확인)→주문완료, 결제후 취소(`orderStatus95`가
Mock의 `cancelPayment` 호출 경유 확인, 환불 반영), 결제 포기(팝업을 결제 없이 닫음
→`orderStatus9` 자동 취소+재고복원), 모바일 풀페이지 결제 흐름까지 DB 상태 대조로
확인했습니다. 이메일은 JSON transport 콘솔 로그로 실제 조립된 메일 내용을, SMS는
`mallRN_sms_list`의 `SKIPPED_NO_CREDENTIALS` 기록을 대조 확인했습니다.

## Phase 6 완료 요약 (게시판/CMS)

계획 문서: `~/.claude/plans/smooth-finding-ullman.md`. "CMS"는 이 코드베이스에서
별도 용어가 아니라 (1) 범용 게시판 엔진(공지사항/FAQ/1:1문의/갤러리), (2) 이용약관·
개인정보처리방침 전체 페이지, (3) 관리자가 만드는 정적 페이지(`mallRN_add_page`)
세 가지를 가리킵니다. 판매사 전용 게시판(vnotice/vcounsel)은 벤더 로그인이 아직
없어 Phase 8로 미룸.

**게시판 테이블 통합**: 레거시는 게시판 인스턴스마다 런타임에
`CREATE TABLE mallRN_board_{id}`를 동적 생성하는 구조(zeroboard 계열)라 정적
Prisma 스키마로 그대로 옮길 수 없습니다. 이 저장소는 `BoardPost`/`BoardComment`
공유 테이블 + `board` 판별 컬럼으로 통합했습니다(카테고리 계층을 `cate_parent`
체인으로 바꾼 것과 같은 종류의 재설계). 스레딩도 `idx/main/sub/depth` 숫자 갭
정렬 대신 flat 댓글(대댓글 없음)로 단순화 — 4개 게시판 중 실제로 고객 댓글이
노출되는 건 gallery뿐이라 깊은 스레딩 자체가 불필요했습니다.

**권한/템플릿은 TS 상수로 하드코딩**: `packages/core/src/board.ts`의
`BOARD_CONFIG`가 게시판별 쓰기/비밀글/카테고리/댓글/첨부 여부를 정의합니다.
`mallRN_board_manager` 같은 관리 테이블은 만들지 않음 — 관리 UI가 없다는 점에서
`popup.ts`/Phase 5 알림 템플릿과 같은 원칙. notice/faq는 쓰기 UI 자체가 없어(관리자
전용) 읽기 전용, counsel은 항상 비밀글(작성자 argon2id 비밀번호로 게이팅, Phase 4
게스트 주문조회와 동일 패턴), gallery만 고객 댓글을 지원합니다.

**파일 첨부**: 로컬 디스크(`apps/storefront/public/uploads/board/{boardId}/{postUid}/`)
저장, 확장자 화이트리스트(jpg/jpeg/png/gif/webp/pdf) + 5MB/파일 + 5개/게시글 캡.
`saveBoardFiles`(서버 전용, `node:fs/promises` 사용)와 `boardFileUrl`(순수 함수)을
별도 파일로 분리했는데, 처음엔 한 파일에 같이 두었다가 시크릿 게시글 잠금해제
클라이언트 컴포넌트가 `boardFileUrl`을 쓰려고 `fs/promises`까지 브라우저 번들에
끌어들여 Turbopack 빌드가 깨지는 실제 버그를 Playwright 검증 중 발견/수정했습니다
— 서버 전용 유틸과 순수 유틸은 항상 파일을 분리할 것.

**핵심 코드**: `packages/core/src/board.ts`(+ `board.test.ts`)/`add-page.ts`,
`apps/storefront/lib/board-upload.ts`/`board-file-url.ts`,
`apps/storefront/app/board/[boardId]/`(list/detail/write pages + actions.ts),
`apps/storefront/app/agreement/`·`app/privacy/`·`app/page/[uid]/`,
`components/BoardPostBody.tsx`/`SecretPostUnlock.tsx`/`BoardCommentSection.tsx`/
`BoardWriteForm.tsx`. `agreement_info1/2`는 `shop_config`(uid=1)가 아니라
`member_config`(uid=2) 행에 있다는 걸 조사 중 확인 — `getAgreementPages()`
(`packages/core/src/member.ts`)로 별도 조회.

**Playwright E2E로 실제 검증 완료**: notice/faq 목록·상세 읽기전용 렌더링(글쓰기
버튼 없음 확인), counsel 게스트 비밀글 작성→목록에서 잠금 아이콘 확인→오답
비밀번호 거부→정답으로 열람, gallery 이미지 첨부 작성→상세 렌더→댓글 작성까지
DB 상태 대조로 확인. `/agreement`·`/privacy`가 `{PLACEHOLDER}` 치환까지 끝난
상태로 렌더되는지, 시드된 `add_page`가 `/page/1`에서 렌더되는지도 확인했습니다.

## 핵심 설계 결정 (다시 논의하지 않아도 되는 것들)

- **DB**: 기존 71개 테이블 중 실제로 필요한 것만 그때그때 추가. `install_post.php`의
  DDL을 그대로 적용 후 `prisma db pull`로 introspect → 모델명만 `@@map`으로 정리
  (컬럼명/테이블명은 원본 그대로 유지, 로직 이관 리스크를 줄이기 위함).
  **주의**: `prisma db pull`은 실행할 때마다 스키마 전체의 `String @db.Text` 컬럼에
  수동으로 붙여둔 `@default("")`를 전부 지워버림(새로 추가되는 테이블뿐 아니라 기존
  테이블도 전부). `db pull` 이후에는 항상
  `grep -n "@db.Text$" packages/db/prisma/schema.prisma | grep -v "@default"`로
  빠진 곳을 확인하고 다시 채워야 함 — 안 그러면 해당 필드를 생략한 `create()` 호출이
  전부 "Argument X is missing" 에러로 깨짐.
- **인증**: PHP 세션이 아니라 서명된 httpOnly 쿠키(JWT, `jose`). 신규설치라 레거시
  MD5 비밀번호 호환 불필요 — 처음부터 `argon2id`.
- **PC/모바일**: 반응형이 아니라 레거시처럼 서버에서 User-Agent로 분기해서 완전히
  분리된 컴포넌트 트리를 렌더링 (`proxy.ts` = 구 middleware, `x-device` 헤더).
- **관리자/입점사**: 레거시의 `managers/`+`vendor/` 중복 구조를 그대로 복제하지 않고,
  하나의 backoffice 앱에서 role(admin/vendor)로 분기.
- **결제**: KCP(컴파일 바이너리+SOAP)는 스텁, aronhub→nicepay→inicis 순으로 실제 구현
  (Phase 5에서 aronhub 완료 — 카드/휴대폰만 지원, 가상계좌/실시간계좌이체는 nicepay
  단계에서). `PaymentGateway` 인터페이스(`packages/core/src/payment.ts`) 뒤에 실제
  자격증명 없으면 `MockPaymentGateway`로 자동 폴백하는 게이팅 패턴 확립 — 이후
  nicepay/inicis도 동일 패턴으로 추가.
- **카트/주문 트랜잭션**: 레거시는 DB 트랜잭션이 전혀 없지만(순차 호출+수동 보상으로
  "롤백" 흉내), 이 저장소는 `createOrder`/`orderStatus9`/`orderStatus95`를
  `prisma.$transaction`으로 감싸 실제 원자성 보장(Phase 4, 상세는 아래 "Phase 4 완료
  요약" 참고). 재고 차감은 조건부 `UPDATE ... WHERE qty >= N`으로 동시성 오버셀 방지.
- **카테고리 계층**: 레거시의 자릿수 슬라이싱(`SUBSTRING(cate,1,i)`) 대신
  `cate_parent` 체인을 직접 타는 방식으로 재구현 (더 견고함, 영구 개선사항이며 나중에
  되돌릴 필요 없음).
- **비밀번호 해시**: `@node-rs/argon2` (argon2id). 로그인 실패 잠금(`fail_cnts`/
  `fail_time`)은 `Configuration.member_limit_count/minute`를 그대로 읽어 레거시와
  동일한 정책 적용.
- **React 19 서버 액션 패턴**: `useActionState(action, initialState)`에 서버 액션을
  래핑 없이 직접 넘겨야 함. 클라이언트 쪽 래퍼 화살표 함수로 감싸면 `redirect()`의
  `NEXT_REDIRECT` 시그널이 서버 액션 RPC 경계를 못 넘어서 리다이렉트가 조용히 무시됨
  (세션 쿠키는 정상 설정되지만 브라우저가 이동하지 않는 형태로 나타남). 이 저장소의
  모든 폼 액션은 `(prevState, formData) => result` 시그니처로 통일하고 항상
  직접 전달한다.

## 미뤄둔 것 (버그 아님 — 아래는 의도적 스코프 컷)

### 소셜로그인 (naver/kakao/google/payco)
**구조는 완성, 실제 키는 없음.** `packages/auth/src/social.ts`에 4개 프로바이더의
OAuth2 authorization-code flow(인증 URL 생성/토큰 교환/프로필 조회, 프로바이더별 응답
정규화)가 구현되어 있고, `apps/storefront/app/auth/[provider]/route.ts`(리다이렉트) +
`app/auth/[provider]/callback/route.ts`(콜백, 회원 조회/생성 + 세션 발급)가 연결되어
있음. `mallRN_configuration_social.used=1` + client_id/secret이 실제로 설정되기 전까지는
해당 프로바이더가 404("설정되지 않았습니다")를 반환하고 로그인 버튼 자체가 안 보임
(레거시와 동일한 게이팅 동작, `getSocialAppConfig()`/`getEnabledSocialProviders()`로
확인). 나중에 실제 앱 키가 생기면 `ConfigurationSocial` 테이블에 값만 채우면 바로
동작함 — 코드 변경 불필요.

### KCP 결제
컴파일 바이너리+SOAP라 Node로 직접 포팅 불가. `PaymentGateway` 인터페이스 뒤에 스텁만
있음. ✅ aronhub는 Phase 5에서 구현됨(카드/휴대폰만) — nicepay/inicis(가상계좌/
실시간계좌이체 포함)는 아래 "결제(PG)/알림" 항목 참고.

### 휴면회원 (`mallRN_member_sleep`)
테이블 자체를 안 만듦 — 휴면 전환은 스케줄 작업(`async_day_proc.php`, Phase 9)이
있어야 의미가 있는데 아직 그 인프라가 없음.

### 리뷰 (`mallRN_review`)
아직 테이블 없음. `mallRN_order_goods`(Phase 4에서 추가됨)가 있어 `og_uid` 참조는
이제 가능하지만, 리뷰 테이블/작성 UI 자체는 아직 구현하지 않음 — 상품상세 페이지는
여전히 카운트 0/빈 상태 텍스트만 표시. 다음 착수 시 차단 요인 없음.

### 상품문의 — ✅ Phase 3에서 처리
`mallRN_inquiry` 테이블 추가 + `packages/core/src/inquiry.ts` + 상품상세 페이지의
문의 탭(작성/목록, 비밀글 게이팅) + `/my_inquiry`(내 문의내역). **회원 전용으로
단순화**: 레거시는 비회원도 비밀번호 입력으로 작성 가능(`mallRN_inquiry.passwd`,
`popup_passwd.php`)하지만, 이 저장소는 이미 완성된 회원 인증(Phase 3)만 사용 —
비회원 비밀번호 검증 플로우는 구현하지 않음. 답변 작성(관리자/입점사 UI)은 여전히
Phase 7/8 대기 중이라 `answer`는 항상 빈 값("답변대기중")으로만 보임.

### 카트/주문 — ✅ Phase 4에서 처리
`mallRN_cart`/`mallRN_order_info`/`mallRN_order_goods`/`mallRN_order_log`/
`mallRN_order_delivery`/`mallRN_coupon`/`mallRN_coupon_manager`/`mallRN_mileage`
테이블 추가 + `packages/core/src/cart.ts`/`coupon.ts`/`mileage.ts`/`order.ts` +
`/cart`, `/order`, `/order/complete`, `/my_order`, `/my_order/[order_num]`,
`/my_order/guest` 페이지. 장바구니 담기(옵션 선택 포함)부터 결제, 주문내역 조회,
취소까지 실사용 가능. **단순화/스코프컷한 부분**:
- **결제수단은 무통장입금(B)/마일리지 전액결제(M)/카드(C)/휴대폰(H)** — 실시간계좌이체/
  가상계좌는 아론허브가 지원하지 않아(아래 "결제(PG)/알림" 항목 참고) 여전히 미지원.
- **무통장입금은 레거시처럼 입금대기(status=0)로 남김** — 관리자 입금확인 화면이
  Phase 7까지 없어 결제완료 전환 수단이 아직 없음(아래 "나중에 확인할 사항" 참고).
- **배송상태 진행(배송준비중/배송중/배송완료)과 구매확정은 전부 Phase 7/8 대기** —
  `orderStatus4`/`orderStatus5` 함수는 포팅되어 있으나 호출하는 UI가 없음.
- **부분환불(`orderStatus95_partial`)은 스코프아웃** — 호출자가 전역변수를 미리
  세팅해야 하는 레거시 안티패턴이고, 그 호출부(admin 부분환불 화면)가 Phase 7 스코프.
  전액취소(`orderStatus9`/`orderStatus95`)만 지원.
- **쿠폰발급은 상품상세 "다운로드"(`coupon_manager.type=4`)만 연결** — 관리자수동/
  가입시/첫주문시/생일 자동발급은 각각 admin 화면·훅·배치잡이 필요해 미착수.
- **게스트 체크아웃 지원** — `mallRN_order_info.passwd`(argon2id 해시, 레거시는
  MD5)로 게스트 주문조회/취소(`/my_order/guest`). 단, 레거시의 게스트 주문 *목록*
  화면(`order_list_guest.php`로 추정, 실물 미확인)이 아니라 "주문번호+이름+비밀번호로
  단건 조회"로 단순화.
- **`mallRN_order_sales`/`mallRN_order_status_change`/`mallRN_order_related_goods`는
  추가하지 않음** — 각각 admin 매출리포팅, 교환/반품 승인 큐(취소는 회원이 직접
  `orderStatus9/95`를 호출하는 것으로 단순화), 동시구매상품(Phase 2에서 이미 다른
  방식으로 구현됨) 전용이라 불필요.
- **벤더별/지역별 배송정책 차등 없음** — `mallRN_vendor_configuration`/
  `mallRN_delivery_configuration` 테이블이 이 저장소에 없어(다른 곳도 동일한 제약)
  배송비는 상품(`Goods.delivery_type`)과 샵 전역설정(`Configuration`)만으로 계산.
- **카트는 실시간 재계산, side-effect 없는 조회** — 레거시(`getCartGoodsInfo`)는
  카트를 "읽기만" 해도 재고초과 항목을 자동 삭제/수량조정하는 안티패턴이 있었는데,
  이 저장소는 조회(`getCartLine`)와 실제 DB 반영(`validateAndSyncCart`)을 분리함.

**나중에 확인할 사항** (지금은 검증 불가 — 잊지 말고 아래 시점에 확인):
- **[Phase 7] 무통장입금 → 결제완료 전환 경로 없음.** B 주문은 영원히 입금대기
  상태에 머무름 — Phase 7에서 관리자 "입금확인" 액션을 만들 때 `order.ts`의
  `orderStatus1(orderNum, adminId, tx)`를 호출하도록 연결할 것(함수는 이미 있음).
- **[Phase 7] `orderStatus95`(결제후 취소)가 B 주문 실사용 경로로 검증되지 않음.**
  Phase 4 시점엔 M(마일리지 전액) 주문만 결제완료에 도달(Playwright로 검증 완료).
  Phase 7에서 관리자 입금확인 기능이 생긴 뒤 B 주문도 한 번 더 확인할 것.
- **[Phase 7/8] `orderStatus4`/`orderStatus5`(배송완료/구매확정) 호출 지점 없음.**
  마일리지 적립 로직(`saveMileage` 경유)이 이때 처음 실사용 검증됨.
- ~~**[Phase 5] 카드/PG 결제 경로.**~~ ✅ Phase 5에서 아론허브(C/H)로 처리됨 — 아래
  "결제(PG)/알림" 항목 참고.
- **[발견 시] 부분환불 재검토.** Phase 7에서 admin 부분환불 화면(legacy
  `php/admin/*order*cancel*` 계열로 추정, 미확인)을 먼저 찾아 읽고 `orderStatus95_partial`
  포팅 여부 재판단할 것.
- **[발견 시] `order_list_guest.php` 실물 미확인.** `/my_order/guest`를 목록형으로
  확장하려면 그 파일을 먼저 읽고 `guest_where` 쿠키 유도 조건을 확인할 것.

### 결제(PG)/알림 — ✅ Phase 5에서 처리
`PaymentGateway` 인터페이스(`packages/core/src/payment.ts`) + `MockPaymentGateway`
(로컬 개발/테스트 기본값) + `AronhubPaymentGateway`(`payment-aronhub.ts`, 카드/휴대폰만
— 아론허브 자체가 가상계좌/실시간계좌이체 미지원) + `confirmPgPayment`/PG 취소 호출
(`order.ts`) + 콜백 라우트 3개(`app/api/payment/aronhub/{callback,return}`,
`app/api/payment/mock/checkout`) + `/order/pay` 결제위젯 페이지
(`components/PaymentWidget.tsx`). 알림은 `sms.ts`(coolSMS HMAC 서명 포팅, 키 없으면
`mallRN_sms_list`에 `SKIPPED_NO_CREDENTIALS`로 기록 후 스킵)와 `mailer.ts`
(nodemailer, `SMTP_HOST` 없으면 JSON transport로 폴백해 콘솔에만 로그) +
`notification.ts`(오케스트레이션). **단순화/스코프컷한 부분**:
- **나이스페이/이니시스는 아직 미구현** — 가상계좌(V)/실시간계좌이체(R)는 이 두
  PG가 있어야 지원 가능. `getPaymentGateway()`가 `payment_cp`별로 분기하도록
  설계되어 있어 추가 시 기존 코드 변경 없이 새 어댑터만 추가하면 됨.
- **현금영수증(`cashReceiptsApply`) 완전 스코프아웃** — 레거시에서도 B/V/R 전용
  기능이라 이번에 구현한 C/H와 무관.
- **배송완료/구매확정 알림 없음** — Phase 4와 동일한 이유(`orderStatus4/5` 호출
  UI가 Phase 7/8 대기)로 알림도 같이 대기.
- **관리자 알림 on/off 토글 하드코딩** — 레거시 `mallRN_sms_auto.ck_message1/2`,
  `mallRN_auto_mail.send` 같은 관리자 설정 UI가 없어 "항상 시도"로 단순화.
  SMS/이메일 템플릿도 DB 테이블(`mallRN_sms_auto`/`mallRN_auto_mail`) 대신 TS
  함수로 하드코딩(관리 UI 없는 admin 전용 테이블은 스킵하는 기존 원칙과 동일).
- **푸시(FCM) 완전 스코프아웃** — 레거시가 쓰는 FCM Legacy HTTP API가 2024년 6월
  구글에 의해 이미 폐기되어 재구축이 필요함(OAuth2 기반 HTTP v1로 이전해야 함).

**나중에 확인할 사항**:
- **[아론허브 실키 확보 시] 실사용 검증 필요.** 지금까지는 전부 `MockPaymentGateway`로
  검증됨 — 실제 가맹점 자격증명이 생기면 `AronhubPaymentGateway`의 요청/콜백/취소
  흐름을 실제 PG로 한 번 더 확인할 것(특히 콜백에 서명검증이 없다는 레거시 특성상
  `confirmPgPayment`의 금액검증이 실제로 걸리는지).
- **[Phase 7] 무통장입금 결제완료 시에도 `notifyOrderPaid` 연결 필요.** 관리자
  "입금확인" 액션이 `orderStatus1`을 호출할 때 알림도 같이 트리거되도록 반드시
  연결할 것(자동으로 안 붙게 설계되어 있어 잊기 쉬움 — Phase 4의 기존 "나중에
  확인할 사항"과 동일한 함정).

### 회원등급 할인가 — ✅ Phase 3에서 처리
`packages/core/src/member.ts`의 `getMemberDiscountPct()` + `pricing.ts`의
`getGoodsPrice()`가 로그인 회원의 `MemberLevel.discount`를 실제로 적용함(홈/목록/
검색/베스트/신상/모음전/스토어/상품상세 전부 반영). 쿠폰 적용가는 ✅ Phase 4에서
`coupon.ts`로 처리됨(위 "카트/주문" 항목 참고).

### 입점사 사이트 설정 (`mallRN_vendor_configuration`)
테이블 없음. `/store` 페이지는 항상 쇼핑몰 전체 기본값(CS 시간, 노출순서)으로 폴백.

### 홈/공통 위젯 (Phase 1)
- ~~팝업 표시~~ — ✅ Phase 3에서 처리. `packages/core/src/popup.ts` +
  `components/PopupLayer.tsx`, PC(`mallRN_popup`)/모바일(`mallRN_mobile_popup`)
  별도 테이블 그대로 유지, 홈 화면(`channel=="main"`)에서만 렌더링(레거시와 동일).
  **단순화**: 같은 `position`을 공유하는 여러 이미지형 팝업을 슬라이더로 합치는
  로직은 생략 — 각 팝업이 독립된 박스로 렌더링됨. 관리자 CRUD가 없어 콘텐츠는
  `seed.js`의 예시 팝업 1개로 대체.
- ~~검색어 자동완성/최근·추천검색어~~ — ✅ Phase 3에서 처리. `packages/core/src/
  search-keyword.ts` + `components/SearchBox.tsx`(PC/모바일 공용, `variant` prop으로
  마크업만 분기). **단순화**: `mallRN_keyword_autocomplete`(자소분리 매칭 + 인기상품
  기반 자동수집 파이프라인)는 생략하고, 대신 `mallRN_keyword_search`(검색 로그)를
  직접 LIKE 매칭해 자동완성을 제공 — 관리자 수동등록 UI가 없는 지금 더 실용적인
  대안. `mallRN_keyword_recent2`(관리자용 로그, 어떤 화면도 읽지 않음)도 생략.
  개별 검색어 삭제 대신 "초기화"(전체삭제)만 제공.
- 최근본상품 드로어, 퀵메뉴 플로팅 버튼 — `cart_id` 게스트 쿠키 인프라는 ✅ Phase 4에서
  마련됨(`packages/core/src/cart-id.ts`, `apps/storefront/lib/cart-id.ts`)이나 이
  기능들 자체는 아직 미구현.
- 네이버페이 버튼
- 상단 네비 JS 폭 균등분배 (CSS padding으로 단순 대체)

### 상품상세 (Phase 2)
- 옵션 2개 이상 조합가/조합재고 조회 (첫 번째 옵션만 실제 값 노출) — Phase 4에서
  카트 엔진(단일 옵션 차원)은 완성됐지만 조합 UI 자체는 여전히 미구현(레거시도
  AJAX 팝업으로 별도 구현됨). 필요해지면 이때 함께 처리.
- ~~찜하기(즐겨찾기 상품/스토어)~~ — ✅ Phase 3에서 처리. `mallRN_favorite_goods`/
  `mallRN_favorite_store` 테이블 + `packages/core/src/favorite.ts` + 상품상세/
  스토어 페이지의 하트 버튼(토글, 100개 캡 포함) + `/my_favorite_goods`,
  `/my_favorite_store`. 레거시와 동일하게 회원 전용(비회원은 로그인 페이지로 이동).
- 조회수 증가/최근본상품 기록 — `cart_id` 게스트 쿠키 인프라는 ✅ Phase 4에서
  마련됨, 기능 자체는 아직 미구현.
- ~~"이 판매자의 인기상품" 섹션~~ — ✅ Phase 3에서 처리. `detail.ts`의
  `vendorGoods`(`store_display1/2/3` 우선순위 + `order_cnt` 타이브레이커, 현재 상품
  제외, 최대 6개) + 관심스토어 하트 버튼. 상품에 `vendor`가 없으면(직영 상품)
  레거시처럼 렌더링 자체를 생략.

### 검색/목록 UX 단순화
- 페이지네이션: 레거시의 `jquery.timeliny.js` "pageline" 스크러버 대신 번호형 페이지네이션
- "결과 내 검색": 다중 키워드 AND 좁히기 대신 단일 키워드로 단순화

### 게시판/CMS — ✅ Phase 6에서 처리
notice/faq/counsel/gallery 4개만 구현. 판매사 전용 게시판(vnotice/vcounsel)은
벤더 로그인(`v_my_id`)이 있어야 하는데 아직 없어 Phase 8로 미룸. 게시글
수정/삭제 기능은 스코프아웃(v1) — `inquiry.ts`도 없다는 기존 전례를 따름.
게시판별 관리 권한(`mallRN_board_manager`)도 테이블 없이 `BOARD_CONFIG` TS
상수로 하드코딩(관리 UI 자체가 없음). 상세는 위 "Phase 6 완료 요약" 참고.

**[나중에 확인]** `/agreement`·`/privacy`의 `{JOINFORM}`/`{DELIVERYNAME}`/
`{PGNAME}` 플레이스홀더는 각각 `member_config`의 회원가입 항목 토글, 배송사
목록, PG사명에 의존하는데 아직 포팅되지 않아 빈 문자열(JOINFORM/DELIVERYNAME)
또는 하드코딩된 상수(PGNAME="NHN한국사이버결제 주식회사")로 대체함 — 해당
테이블/설정 UI가 생기면 다시 확인할 것.

### 관리자 백엔드, 입점사 백엔드
Phase 7/8 — 전체 미착수.

## 검증 방법

- `pnpm dev` (스토어프론트) + Playwright 스크린샷으로 PC/모바일 실제 렌더링 확인.
- 모바일 고정 헤더(`#topUtil`/`#topContent`)가 있는 페이지는 Playwright `fullPage`
  스크린샷에서 헤더가 스크롤 프레임마다 반복 캡처되어 "중복"처럼 보일 수 있음 — 이건
  실제 버그가 아니라 스크린샷 스티칭 특성. `document.querySelectorAll(...).length`나
  `scrollHeight` 안정성으로 실제 DOM을 확인할 것.
- 반환값이 없는(`void`) 서버 액션을 일반 `<form action={...}>`로 호출하는 경우
  (찜하기 토글 등), `page.waitForLoadState('networkidle')`가 실제 mutation의 완료를
  보장하지 않음 — 풀 네비게이션이 아니라 fetch 기반 RSC 리렌더라 `networkidle`이 먼저
  끝나버릴 수 있음. `waitForTimeout(1000~1500)`을 추가로 넣거나 최종 상태를 다시
  조회해서 확인할 것.
- `prisma generate`로 스키마를 재생성한 뒤에는 실행 중인 `next dev`(Turbopack)
  프로세스를 반드시 재시작해야 함 — 새로 추가된 모델(`prisma.inquiry`,
  `prisma.favoriteStore` 등)이 핫리로드로는 반영되지 않고 "Cannot read properties of
  undefined" 형태의 런타임 에러로 나타남.
- `apps/storefront`에서 `tsc --noEmit`을 `next dev` 실행 중에 돌리면 Next.js가 계속
  다시 쓰고 있는 `.next/dev/types/validator.ts`를 중간에 읽어서 깨진 파일로 오탐
  에러가 남(`TS1109 Expression expected`). `.next` 삭제 후 `next dev`를 한 번
  재기동해 타입을 새로 생성시키면 해결됨 — 실제 코드 에러가 아님.
- **`packages/core`에 vitest 도입됨**(Phase 4) — `cd packages/core && pnpm test`
  (또는 `pnpm exec vitest run`)로 순수 계산 함수(가격/쿠폰할인/배송비) 유닛테스트
  실행. `@shoppingmall/db`를
  import하면 모듈 로드 시점에 PrismaClient가 즉시 생성되므로(`packages/db/src/
  index.ts`), 테스트가 실제 쿼리를 안 날려도 `DATABASE_URL`이 유효한 형식의 문자열
  이어야 함 — `packages/core/vitest.config.mts`에서 더미 값으로 세팅해둠.
- **Playwright npm 패키지 자체가 이 레포에 설치돼 있지 않음**(브라우저 바이너리만
  캐시돼 있음, 위 "빠르게 시작하기" 참고) — `npx --yes playwright@latest --version`
  으로 즉석 설치 후, `~/.npm/_npx/<hash>/node_modules/playwright`를 스크립트 옆
  `node_modules/playwright`에 심볼릭 링크해서 `import { chromium } from
  "playwright"`가 동작하게 만들어야 함(ESM이라 `NODE_PATH`로는 해결 안 됨). 캐시된
  크로미움의 실제 실행파일 경로는 `chromium-1208/chrome-mac-x64/Google Chrome for
  Testing.app/Contents/MacOS/Google Chrome for Testing`(버전에 따라 폴더명이
  `chrome-mac`이 아니라 `chrome-mac-x64`일 수 있음 — 매번 `find`로 확인할 것).
- 서버 액션이 여러 개의 `<form>`에서 `useActionState`의 같은 `formAction`을 공유하는
  화면(예: 장바구니담기/바로구매 버튼)에서 Playwright로 특정 버튼을 클릭할 때
  `button[type="submit"]` 같은 범용 셀렉터는 페이지 상단 검색폼의 제출버튼과 충돌해
  엉뚱한 곳으로 제출될 수 있음 — 버튼 텍스트(`button:has-text("결제하기")`)처럼
  구체적으로 지정할 것.
- **Playwright로 "결제 팝업을 사용자가 그냥 닫는" 시나리오를 테스트할 때 `popup.close()`를
  바로 호출하면 메인 페이지까지 죽는 것처럼 보이는 현상이 있었음**(`Target page,
  context or browser has been closed` 에러) — 원인은 앱 버그가 아니라 Mock 결제
  콜백이 매우 빨라서(수백 ms 안에 `window.close()`까지 자체 실행) 팝업이 테스트
  스크립트보다 먼저 스스로 닫혀버린 레이스였음. `context.route("**/api/payment/mock/
  checkout**", route => route.abort())`로 콜백 자체를 막아서 팝업이 절대 자동으로
  안 끝나게 만든 뒤 `popup.close()`를 호출해야 "포기" 경로를 안정적으로 재현할 수 있음.
- SMS 발송은 `mallRN_sms_list.result`(자격증명 없으면 `SKIPPED_NO_CREDENTIALS`)로,
  이메일은 `next dev`를 실행한 터미널의 `[mailer:json]` 로그(기본 JSON transport,
  실제 조립된 메일 전체가 콘솔에 찍힘)로 확인. `EMAIL_DEV_TRANSPORT=ethereal`을
  `.env.local`에 설정하면 실제로 발송되는 무료 테스트 SMTP로 전환되고 미리보기
  URL이 로그에 남음(수동 1회 확인용, 자동 테스트에서는 기본값 그대로 둘 것).

## 새 테이블 추가 시 체크리스트 (Phase 4부터 그대로 재사용)

1. `packages/db/sql/00N_*.sql`에 `install_post.php`의 해당 DDL을 그대로 복사
2. `docker exec -i shoppingmall-nextjs-mysql mysql -uroot -proot shoppingmall < 그파일.sql`로 적용
3. `cd packages/db && pnpm exec prisma db pull`
4. 새로 생긴 `model mallRN_xxx { ... }` 블록을 PascalCase로 rename + `@@map("mallRN_xxx")` 추가
5. **`grep -n "@db.Text$" packages/db/prisma/schema.prisma | grep -v "@default"`로
   스키마 전체에서 빠진 `@default("")`를 확인하고 복구** (db pull이 매번 전체를
   지워버림 — 위 "핵심 설계 결정" 참고)
6. `pnpm exec prisma format && pnpm exec prisma generate`
7. 실행 중인 `next dev`를 반드시 재시작
8. `pnpm exec tsc --noEmit` (packages/core, packages/db, apps/storefront 각각)

## 세션 인수인계 체크리스트

- `git log --oneline`으로 Phase별 실제 커밋과 커밋 메시지(각 Phase가 무엇을
  포팅/단순화/발견한 버그인지 상세히 적혀 있음) 확인
- 위 "미뤄둔 것" 섹션을 먼저 확인 — 화면에서 뭔가 비어있어 보여도 의도된 스코프컷일
  수 있음. 새로 처리했다면 해당 항목을 `~~취소선~~` + "✅ Phase N에서 처리"로 갱신하고
  단순화한 부분은 반드시 명시할 것(이 문서의 기존 항목들이 그 형식을 따름)
- 검증은 항상 PC+모바일 둘 다 Playwright로 확인 (`~/Library/Caches/ms-playwright/...`
  경로 고정 필요, 위 "빠르게 시작하기" 참고)
- 작업 완료 후 이 MIGRATION.md와 Claude 메모리(`migration_overview`,
  `migration_deferred_items`)를 함께 갱신 — 두 곳의 내용이 서로 어긋나지 않게 유지
