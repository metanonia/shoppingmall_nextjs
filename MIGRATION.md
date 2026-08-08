# PHP → Next.js 16 마이그레이션 현황

이 저장소는 `shoppingmall_php`(레거시 PHP 쇼핑몰)를 Next.js 16으로 화면 픽셀 단위로
이행한 결과물입니다. **신규설치 기준**(기존 운영 데이터 없음)이며, 원본 PHP 저장소와는
물리적으로 분리된 별도 저장소입니다.

다른 작업자가 이 저장소를 이어서 작업하게 될 경우, 아래 내용을 먼저 확인하세요.

## 구조

```
apps/
  storefront/   Next.js 16 — 고객 화면 (PC+모바일)
  backoffice/   관리자+입점사 백엔드 (Phase 7/8 완료, PC 전용). URL 네임스페이스로
                admin(`/`)과 vendor(`/vendor`) role 분기.
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
cd ../backoffice && pnpm dev                # http://localhost:3001 (관리자, PC 전용)
```

- `apps/storefront/.env.local`, `apps/backoffice/.env.local` 둘 다 `DATABASE_URL`,
  `AUTH_SECRET`가 필요합니다(레포에는 커밋되어 있지 않음 — 없으면 각자 새로 생성:
  `AUTH_SECRET`은 임의의 긴 랜덤 문자열, `DATABASE_URL`은
  `mysql://root:root@localhost:3307/shoppingmall`, 두 앱 모두 같은 값 사용).
  `apps/backoffice/.env.local`에는 추가로 `NEXT_PUBLIC_STOREFRONT_URL`(기본
  `http://localhost:3000`)이 필요합니다 — 상품/배너/팝업 이미지가 storefront의
  `public/`에 저장되므로 관리자 화면의 미리보기 이미지가 storefront 쪽 절대 URL을
  가리켜야 합니다. `apps/backoffice/.env.local`에는 Phase 9부터 `CRON_SECRET`도
  필요합니다(임의의 문자열) — 아래 "cron 작업" 참고.
- **cron 작업(Phase 9)**: `packages/core/src/scheduled-jobs.ts`(쿠폰/마일리지
  만료, 전시 상태전환, 휴면회원 전환, 로그 정리)와 `delivery-tracker.ts`(배송추적
  폴링)는 상시 프로세스가 아니라 `apps/backoffice`의 HTTP 엔드포인트로 노출되어
  있습니다 — 외부 스케줄러(시스템 crontab 등)가 주기적으로 호출해야 합니다:
  ```bash
  # 매일 1회
  curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3001/api/cron/daily
  # 매시간(또는 원하는 주기)
  curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3001/api/cron/tracker
  ```
  배송추적은 `SWEETTRACKER_API_KEY`가 없으면 Noop으로 안전하게 스킵됩니다(아래
  "나중에 확인" 참고).
- 관리자 계정: 시드에 `id=admin / password=admin1234`(level=100)로 로그인 가능한
  계정이 포함되어 있습니다 — `apps/backoffice`에서 로그인.
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
| 7 | 관리자 백엔드 | ✅ 완료 (풀스코프, 아래 참고) |
| 8 | 입점사 백엔드 | ✅ 완료 (정산 포함 풀스코프, 아래 참고) |
| 9 | 하드닝/정규화/마무리 | ✅ 완료 (실용적 풀스코프, 아래 참고) |

**9단계 계획 전체 완료** — 단, 이는 "각 Phase 착수 시 합의한 스코프" 기준
완료이지 레거시 전체 기능과의 1:1 패리티를 의미하지 않습니다. **완결성
재검토(2026-08-08) 결과 각 Phase 진행 중 스코프 논의에서 아예 다뤄지지 않아
"미뤄둔 것"에 문서화되지 못한 레거시 기능이 다수 발견됐습니다** — 버그가
아니라 "존재 자체를 몰랐던 누락"입니다. 사용자 지시로 발견된 항목 전부를
우선순위 순 그룹(A~I)으로 나눠 구현했고, **발견된 항목 전부 처리 완료**
(기타정책·관리자목록컬럼커스터마이징 2개만 비용 대비 가치가 낮아 의도적
스코프컷, 근거는 아래 섹션에 명시) — 상세는 아래 "## 마이그레이션 완결성
감사" 섹션과 [[migration_completeness_audit]] 메모리 참고. 이 저장소를
넘겨받는 작업자는 "9단계 완료"라는 문구만 보고 레거시 기능이 전부 있다고
가정하지 말고, 완결성 감사 섹션에서 취소선이 없는(스코프컷) 항목의 근거가
여전히 유효한지 재검토하세요 — store_display 사례처럼 스코프컷 근거가
스테일해질 수 있습니다([[migration_deferred_items]] 참고).

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
없어 Phase 8로 미뤘었으나, Phase 8에서 벤더 로그인은 생겼지만 vnotice/vcounsel
게시판 자체는 승인된 스코프(입점신청/상품/주문/정산/스토어설정)에 없어 여전히
미착수 — 9단계 계획 완료 이후 별도 스코프로 재검토 필요.

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

## Phase 7 완료 요약 (관리자 백엔드)

계획 문서: `~/.claude/plans/smooth-finding-ullman.md`. 사용자 확정 스코프: **풀스코프**
(회원관리 전체/마일리지조정/통계/입점사 승인 포함) + **부분환불 포함**. 새
`apps/backoffice` Next.js 16 앱(포트 3001, PC 전용, 반응형/모바일 분기 없음)을
이번에 처음 만들었습니다 — Phase 8(입점사 백엔드)이 같은 앱에 vendor role
분기를 추가할 예정입니다.

**인증**: 레거시는 회원 테이블을 공유하되 `level>=99`만 관리자로 취급하고
자체 쿠키(`my_id`+`sid`)로 로그인 상태를 판별합니다. 이 저장소는 별도 로직 없이
기존 `authenticateMember()`(회원 로그인과 동일 함수)를 재사용하고 `level>=99`
검사 후 `role:"admin"` 세션을 발급합니다. **세션 쿠키는 storefront와 이름을
분리**(`shoppingmall_admin_session`)했습니다 — 로컬 개발에서 두 앱이 포트만
다른 같은 호스트(`localhost`)라 브라우저가 쿠키를 포트로 구분하지 않아, 이름이
같으면 관리자 로그인이 같은 브라우저의 회원 세션을 덮어쓰는 사고가 날 수
있습니다.

**주문관리**: `order.ts`에 `orderStatus4`(배송완료)/`orderStatus5`(구매확정+
마일리지 적립)/`updateDeliveryProgress`(배송준비중→배송중 전환+SMS)/
`confirmBankTransferPayment`(무통장입금 확인, `orderStatus1`+`notifyOrderPaid`
래핑)를 추가해 [[migration_deferred_items]]의 "Phase 7 대기" 항목 대부분을
해소했습니다. **부분환불**(`partialRefundOrder`)은 레거시
`orderStatus95_partial()`의 `global $refund/$mileage/$refund_fee/$coupon/
$delivery` 전역변수 계약을 명시적 함수 인자로 재설계 — 마일리지 환원/추가적립
분배 로직은 `calcMileageRefundSplit()`으로 순수함수 분리해 vitest로 검증.
관리자 전용 목록/상세는 `order-admin.ts`(비밀번호 게이팅 없는 admin 조회,
매출통계 `getSalesStats`도 여기 포함).

**상품/카테고리**: `goods-admin.ts`(약 47개 필드의 상품 등록/수정, 다차원 옵션
카티션곱 생성기 `generateOptionCombinations` 1000개 캡, vitest 검증),
`category-admin.ts`(카테고리 CRUD — 레거시의 4단계×3자리 숫자 인코딩을 버리고
`cate`를 위치 의미 없는 단순 유니크 id로 재설계, 트리 구조는 전부
`cate_parent`/`cate_dep`/`sequence`로 표현), `exhibition-admin.ts`(기획전
CRUD, 레거시의 `cate_info` 서브그룹 기능은 미지원 — 플랫 상품목록만).

**회원관리**: `member-admin.ts`(목록/등급 일괄변경/쿠폰 대량발급/마일리지
수동조정). `saveMileage`/`useMileage`(mileage.ts)에 `procId` 파라미터를
추가해 관리자 수동 조정 시 처리자 id가 `mallRN_mileage.proc_id`에 남도록
했습니다(기존 호출부 전부 `""` 전달로 하위호환 유지). **탈퇴회원 목록은
스코프아웃** — `withdrawMember()`가 하드 delete라 감사(audit) 테이블 자체가
없어 보여줄 데이터가 없습니다.

**게시판 관리자 답변**: `BOARD_CONFIG`에 `commentAuthor: "customer"|"admin"|null`
추가 — gallery는 기존대로 고객 댓글, **counsel은 댓글을 관리자 전용으로 켜서
"1:1문의 답변" 기능으로 재사용**(레거시도 동일한 댓글 메커니즘을 답변에 재사용).
`createPost`에 `actingAsAdmin` 우회 옵션을 추가해 admin이 notice/faq에 쓸 수
있게 했고, `updatePost`/`deletePost`(admin 전용)도 신규 추가. **storefront
쪽도 함께 수정**해야 했음: `BoardCommentSection`에 `canWrite` prop을 추가해
counsel에서는 답변만 읽고 쓰기 폼은 숨기도록 했고, 게스트가 비밀글을 클라이언트
쪽에서 잠금해제(`SecretPostUnlock`)하는 경로에도 댓글(관리자 답변)이 같이
보이도록 `unlockSecretPostAction`이 댓글도 함께 반환하게 확장 — 이 부분을
놓쳤으면 게스트로 작성한 1:1문의는 답변이 영원히 안 보이는 버그가 났을 것.

**디자인/설정**: `design-admin.ts`(배너/팝업 CRUD, PC/모바일 device 분기는
`popup.ts`의 기존 읽기 패턴과 동일하게 명시적 분기), `add-page.ts`에 CRUD
추가. `config.ts`에 `updateBasicConfig`/`updateDeliveryConfig`/
`updatePaymentConfig`, `member.ts`에 `updateAgreementPages` 추가.

**이미지 업로드는 앱 경계를 넘습니다**: 상품/배너/팝업/기획전/add_page 이미지는
고객이 보는 `apps/storefront`의 `public/image/...`에서 서빙되므로,
`apps/backoffice`의 업로드 유틸(`lib/image-upload.ts`)이 `process.cwd()`
기준으로 `../storefront/public/image/...`에 직접 파일을 씁니다(한 호스트에서
두 앱을 함께 운영하는 현재 구조 전제 — 멀티호스트 배포 시 공유 스토리지로
교체 필요). 관리자 화면의 미리보기 썸네일은 반대로 storefront 쪽 절대 URL
(`NEXT_PUBLIC_STOREFRONT_URL`)을 가리켜야 해서 `lib/image-url.ts`로 분리
(Phase 6의 "서버전용 유틸과 순수 유틸 분리" 교훈을 그대로 적용).

**입점사 최소 관리**: `vendor-admin.ts`(목록+승인/거절 토글만). 정산/통계는
`mallRN_sales_calculate` 등 정산 전용 테이블이 없어 Phase 8 스코프로 유지 —
✅ Phase 8에서 처리(아래 "Phase 8 완료 요약" 참고).

**스코프 제외 항목**(범위 논의 시 이미 문서화, 재검토 불필요): 방문자/키워드
통계(추적 인프라 자체가 없음), 배송 송장 엑셀 일괄업로드(단건 입력만 지원),
관리자 대시보드 위젯 20종(핵심 지표 3개로 축소), 게시글 삭제는 admin 전용(고객
편집/삭제는 계속 스코프아웃, Phase 6 결정 유지).

**이번 Phase는 새 테이블이 없습니다** — 주문/상품/카테고리/회원/쿠폰/마일리지/
게시판/배너/팝업/add_page/입점사 테이블이 전부 Phase 1~6에서 이미 스키마에
있었고(마일리지의 `proc_id`도 이미 존재), Phase 4~6의 "새 테이블 추가
체크리스트"는 이번엔 필요 없었습니다.

**Playwright E2E로 실제 검증 완료**: 관리자 로그인(레벨 미달 계정 거부 포함)/
로그아웃/보호된 라우트 리다이렉트, 주문 전체 사이클(무통장입금확인→배송준비→
배송중(송장)→배송완료→구매확정, 마일리지 적립 DB 대조 확인), 부분환불(마일리지
환원 계산 DB 대조), 주문 전체취소, 상품 등록(옵션 2축 포함)→storefront에서
이름/가격/옵션 정상 노출 확인, 카테고리 생성→storefront 상단 카테고리 목록에
즉시 반영 확인, 기획전 생성+상품 추가, 회원 등급 일괄변경, 쿠폰 발급, 마일리지
수동조정(`proc_id` 기록 확인), notice 작성, counsel 답변→게스트가 비밀번호로
잠금해제 시 답변이 보이고 댓글 작성폼은 숨겨지는지(gallery는 반대로 계속 보임,
회귀 없음 확인), 배너/팝업/add_page CRUD(스토어프론트 앱 경계 넘어 이미지 업로드
포함), 설정 저장→storefront `/agreement` 즉시 반영, 입점사 승인/거절 토글까지
DB 상태 대조로 확인. 이 과정에서 실제 버그 1건 발견/수정: `CategoryTree.tsx`에서
수정용 `<form>`과 삭제용 `<form>`을 중첩시켜(잘못된 HTML) React hydration이
깨졌던 것 — 두 폼을 형제 요소로 분리.

## Phase 8 완료 요약 (입점사 백엔드)

계획 문서: `~/.claude/plans/smooth-finding-ullman.md`. 사용자 확정 스코프: **정산
포함 풀스코프** — 입점신청(공개 셀프서비스)+로그인+본인 상품관리(승인게이트
포함)+본인 주문관리(배송처리만)+스토어설정+정산. `apps/backoffice`는 Phase 7의
admin에 이어 이번에 vendor role을 같은 앱에 추가했습니다(새 앱을 만들지 않음
— `packages/auth`의 `SessionPayload.role`/`vendorId`가 애초에 이 구조로
설계돼 있었음).

**라우팅/세션**: admin은 `app/(protected)/...`(URL 프리픽스 없음), vendor는
`app/vendor/(protected)/...`(URL `/vendor/...`) 그룹. 로그인 페이지는
`app/vendor/page.tsx`(실제 폴더) — storefront `Footer.tsx`에 이미 하드코딩돼
있던 `/vendor/` 링크(`design_vendor_link` 플래그로 노출 제어, 시드에서 1로 켬)와
충돌하지 않도록 보호 라우트 그룹을 그 안에 중첩시켰습니다. 세션 쿠키는 admin과
공용(`shoppingmall_admin_session`) — `getSession()`이 `role==="admin"||
role==="vendor"`를 모두 허용하고 `requireAdmin()`/`requireVendor()`가 각각의
role만 통과시킵니다.

**입점사 가입/로그인**: `packages/core/src/vendor.ts`(`registerMember`와 동일
패턴의 공개 셀프서비스 — `registerVendor`/`authenticateVendor`/
`getVendorProfile`). 가입 시 `auth='R'`(승인대기)/`sell='R'`/`goods_auth='A'`
강제, 승인은 Phase 7에서 이미 만든 `/vendors` 화면(`updateVendorAuth`) 재사용.
`apps/storefront/app/regist_vendor/`(공개 가입 폼). **버그 1건**: 레거시
`Vendor.passwd`가 `varchar(50)`(MD5용)라 argon2id 해시(~97자)가 안 들어가
Playwright 테스트 중 P2000 에러로 발견 — `varchar(100)`으로 확장
(`012_phase8_widen_vendor_passwd.sql`). `Member.passwd`는 이전 Phase에서 이미
넓혀뒀었는데 `Vendor.passwd`는 이번에 처음 실사용되면서 드러남.

**상품관리**: `goods-admin.ts`는 순수 CRUD로 유지하고 `createGoods`에
`autoApprove` 옵션만 추가(vendor의 `goods_auth==='A'`면 자동승인, 아니면
승인대기 `auth_ck='N'`). 목록 필터에 `vendor`/`authCk` 추가. `GoodsForm`/
`GoodsOptionBuilder`에 `actions`/`vendorLocked` prop을 추가해 admin/vendor가
같은 컴포넌트를 재사용(vendor는 `vendor` select 대신 hidden으로 세션 vendorId
강제). vendor 액션 레이어는 클라이언트가 보낸 `vendor` 필드를 절대 신뢰하지
않고 세션 값으로 강제 덮어쓰며, 수정/옵션 조작 전 소유권(`existingGoods.vendor
=== vendorId`) 검사 — Playwright로 타 입점사 상품 수정 URL 접근 시 404 확인.
admin `/goods`에 승인대기 필터+승인 버튼 추가(`approveGoodsAuth`).

**주문관리**: 새 `packages/core/src/vendor-order.ts`(`getVendorOrderList`/
`getVendorOrderDetail` — `OrderGoods.vendor_delivery`로 스코프, admin의
`order-admin.ts`와 동일 페이지네이션 패턴). 상태변경은 새 core 함수를 만들지
않고 Phase 7의 `updateDeliveryProgress`/`orderStatus4`/`orderStatus5`를 그대로
호출하되, vendor 액션 레이어(`assertOwnsOrderLines`)가 매 요청마다 `og_uid`가
자기 `vendor_delivery` 소속인지 검증 후 위임. 입금확인/전체취소/부분환불 버튼은
vendor 페이지에 아예 렌더하지 않음(레거시도 UI 자체가 없음). Playwright로
배송처리(송장입력)→배송완료→구매확정 전체 사이클과, 타 입점사 주문 상세
접근 시 404를 확인.

**정산**: 레거시 `mallRN_order_sales`(23컬럼 범용 매출 리포팅)/
`mallRN_sales_calculate`(세금계산서/상태 수동토글 워크플로)를 그대로 포팅하지
않고 목적에 맞게 축소 재설계(게시판/카테고리 코드와 같은 재설계 원칙,
테이블명은 유지). `OrderSales`는 `createOrder`가 라인 생성 시 커미션 스냅샷과
함께 자동 insert(`commission_pct = goods.commission_type===0 ? vendor.
commission : goods.commission`, 레거시 `order_post.php:269-272`와 동일 규칙),
`orderStatus5`(구매확정) 시점에 `confirmed=1`로 갱신(레거시가
`mallRN_order_sales.confirmation`을 세팅하는 시점과 동일). 관리자가
`/vendors/[uid]/settlement`에서 기간을 선택하면 확정·미정산(`confirmed=1
&& settled=0`) 라인을 집계 미리보기 → 확정 버튼으로 `SalesCalculate` insert +
해당 `OrderSales.settled=1` 갱신을 하나의 트랜잭션으로 처리(레거시
`calculate_post_json.php`의 `adjustment=1`과 동일 원자성). 입점사는
`/vendor/settlement`에서 자기 `SalesCalculate` 이력만 읽기전용 조회. **세금계산서
발행여부/정산상태(대기→지급완료) 수동토글, 정산유형(현금/계좌) 구분은
스코프아웃**(사용자 확정 스코프) — Playwright로 커미션 10% 상품 판매→구매확정→
관리자 정산확정(상품금액/수수료/정산액 계산 정확성)→입점사 조회 화면 반영까지
DB 대조로 검증.

**스토어 설정**: `mallRN_vendor_configuration` DDL 그대로 적용,
`VendorConfiguration`으로 매핑. CS시간 4종/반품지주소/상품 기본 안내문구(배송·
환불·교환·AS) 4종만 vendor가 `/vendor/store`에서 편집 — 진열순서 커스터마이징
등 디자인 커스텀 컬럼은 admin 백엔드 없이 미사용 컬럼으로 남김(`Configuration`의
기존 미사용 컬럼과 같은 원칙). `store.ts`의 `getStoreInfo`가 CS시간을
`VendorConfiguration` 값 우선, 없으면 기존 하드코딩 폴백으로 사용하도록 수정.
**추가로 발견해 처리한 연결고리**: `mallRN_goods.information_use`(레거시 컬럼,
기존엔 어디서도 안 읽힘) — legacy `view.php:155-167`가 이 값이 1이면 상품별
배송/환불/교환/AS 안내 대신 벤더의 공통 안내문구를 보여주는 토글이라는 걸
확인하고 `detail.ts`의 `getGoodsDetail`에 동일 분기를 추가(기본값 1 = 벤더
설정 사용, 벤더가 설정을 안 했으면 기존처럼 상품별 필드로 폴백 — 기존 상품
전부가 안전하게 폴백되는지 확인). GoodsForm에 이 토글 UI 자체는 추가하지 않음
(항상 1, 상품별 커스텀은 계속 상품 텍스트 필드로만 가능 — 스코프컷).

**Playwright E2E로 실제 검증 완료**: 입점신청(공개)→admin 승인→vendor
로그인→상품 등록(자동승인/승인대기 분기)→admin 승인→storefront 노출,
상품 수정/옵션 관리 소유권 경계(404), 주문 배송처리 전체 사이클→구매확정 시
`OrderSales.confirmed` 갱신, 주문 상세 소유권 경계(404), 정산 확정(커미션
계산 정확성 DB 대조)→입점사 조회 반영, 스토어 설정 저장→`/store` 페이지 및
상품상세 안내문구 반영까지 확인. vitest는 57개 그대로 통과(이번 Phase는 새
순수함수를 분리하지 않음 — 커미션 계산은 `order.ts`의 트랜잭션 안에 인라인).

**새 테이블 3개**: `mallRN_vendor_configuration`(레거시 DDL 그대로),
`mallRN_order_sales`/`mallRN_sales_calculate`(재설계, 위 "정산" 참고) —
`packages/db/sql/011_phase8_vendor.sql`. `Vendor.passwd` 폭 확장은
`012_phase8_widen_vendor_passwd.sql`.

## Phase 9 완료 요약 (하드닝/정규화/마무리)

계획 문서: `~/.claude/plans/smooth-finding-ullman.md`. 사용자 확정 스코프:
**실용적 풀스코프** — cron(휴면회원 전환+쿠폰/마일리지 만료+전시 상태전환을
Node 스케줄러로, 배송추적은 자격증명 없으면 스킵)+옵션 조합가/조합재고
정규화+보안 리뷰(XSS 교차검증+업로드 경로 점검). 원래 마스터플랜의 "전체
112개 템플릿 시각적 회귀 스윕"은 레거시 PHP를 띄울 참조 환경 자체가 이
저장소에 없어(별도 선행 인프라 작업이 필요) 스코프아웃 — 대신 이 Phase가
건드린 화면들을 Playwright로 재스팟체크.

**다차원 옵션 조합 정규화**: 스키마/`cart.ts` 무변경으로 해결됨 —
`GoodsOption.value`가 이미 `generateOptionCombinations`(Phase 7)로 조합별
파이프 구분 문자열(`"화이트|S"`)로 저장되어 있었고, `cart.ts`의 `addToCart`도
애초에 단일 `optionUid`(조합 행의 uid)만 받는 구조라 다차원 개념 자체가 없었음
— 즉 쓰기 경로는 이미 완성돼 있었고 읽기 경로만 비어 있었던 것. `detail.ts`에
`OptionCombination`(`{ uid, parts, price, priceLabel, soldOut }`) 타입과
`GoodsDetailViewModel.optionCombinations` 필드를 추가해 2차원 이상일 때도 전체
조합 행을 노출하도록 수정, `CartActions.tsx`를 모든 `OptionGroup`을 렌더링하고
선택한 조합을 `optionCombinations`에서 찾아 `optionUid`/가격/품절을 해석하는
방식으로 재작성. 색상×사이즈 2차원 상품 등록→상품상세에서 두 차원 선택→조합별
가격(+2,000원)/품절 정확히 반영→장바구니/주문까지 Playwright로 DB 대조 검증.

**보안 하드닝(XSS)**: 벤더가 작성하는 리치텍스트 필드(상품 상세설명/요약설명,
배송·환불·교환·AS 안내문구 — 상품별 + Phase 8의 `VendorConfiguration` 공통값
둘 다)가 storefront에서 `dangerouslySetInnerHTML`로 그대로 렌더링되고 있었음.
Phase 8에서 벤더가 `goods_auth==='A'`면 admin 검수 없이 자기 상품을 즉시
노출할 수 있게 됐으므로 실제로 악용 가능한 저장형 XSS 공격면이었음. `sanitize-
html` 패키지로 `packages/core/src/sanitize.ts`의 `sanitizeRichText()`를 만들어
`goods-admin.ts`의 `toGoodsData()`(explains/detail/delivery_info/refund_info/
exchange_info/as_info — admin/vendor 양쪽 액션이 전부 이 함수를 거침)와
`vendor.ts`의 `updateVendorConfiguration()`(동일 4종 안내문구)에 적용. 허용
태그는 b/i/u/strong/em/p/br/div/span/ul/ol/li/a[href]/img[src,alt,width,height]/
table류/h1-h6 + 최소 인라인 style로 제한, `<script>`/`<iframe>`/`on*` 이벤트/
`javascript:` URL은 라이브러리 기본 정책으로 차단. Playwright로 실제
`<script>alert(1)</script>`/`<img onerror=...>` 를 상품 상세설명·안내문구·벤더
스토어 설정에 입력→저장 후 storefront 렌더링에서 alert가 뜨지 않고 안전한
텍스트만 남는지, 정상 서식 태그(`<b>`, `<p>`)는 보존되는지 둘 다 확인. 다른
`dangerouslySetInnerHTML` 사용처(약관/공지사항/팝업/기획전 설명 등)는 전부
admin 전용 CMS 입력이라 이번 스코프에서 제외.

**cron 인프라**: 레거시 `async_day_proc.php`/`async_tracker.php`도 실제로는
외부에서 주기적으로 자기 자신을 HTTP로 호출하는 self-ping 구조였음(리퍼러/IP
체크로 게이팅). 이 저장소엔 상시 프로세스 인프라가 없어(`node-cron` 등) 같은
패턴을 재현: `apps/backoffice/app/api/cron/daily`·`.../tracker` 라우트를
만들고 `Authorization: Bearer $CRON_SECRET` 헤더로 게이팅(레거시의 리퍼러/IP
체크에 대응, `apps/backoffice/lib/cron-auth.ts`). 실제 트리거는 시스템
crontab이 curl로 호출하는 방식(위 "빠르게 시작하기" 참고) — 앱 프로세스 안에
상시 스케줄러를 띄우지 않음.

**일일배치**(`packages/core/src/scheduled-jobs.ts`): `expireCoupons()`(status
0→2, `e_date` 지난 미사용 쿠폰만), `expireMileageLots()`(`useMileage()`와
동일한 "역분개 행 insert, 원장 직접수정 안 함" 원칙으로 FIFO lot 만료 처리),
`updateExhibitionStatuses()`(1→2는 `s_date` 도래, 2→3은 `e_date` 경과 —
"아직 스케줄 안 정해짐" sentinel(`1000-01-01`류)은 제외 처리해 초안 상태
기획전이 실수로 시작되지 않게 함), `purgeOldLogs()`(`KeywordRecent`/
`KeywordSearch`/`SmsLog` — 레거시가 정리하는 테이블 대부분은 방문자추적
인프라 자체가 없어 애초에 존재하지 않음), `processDormantMembers()`(아래).
전부 `runDailyBatch()`로 묶여 `/api/cron/daily`가 호출. 만료 대상 쿠폰/
마일리지/기획전을 DB에 직접 세팅→cron 호출→금액/상태 정확성 DB 대조로 검증,
재호출 시 0건(멱등성)도 확인.

**휴면회원 전환**: 새 `MemberSleep` 모델(레거시 `mallRN_member_sleep` DDL
그대로 — 개인정보 스냅샷 아카이브 테이블이라 재설계 불필요, `Member`도 이미
레거시와 거의 1:1). `Member.login_time` 기준 365일 경과 시 `MemberSleep`에
스냅샷 insert + `Member` 행 삭제(트랜잭션, 레거시와 동일 순서), 335일
경과(전환 30일 전) 시 `mailer.ts`의 `renderDormantWarningEmail()`로 1회성
경고 메일만 발송. `login_time===0`(가입 후 미로그인)인 회원은 `signdate`를
기준으로 삼아 신규 가입자가 즉시 휴면 대상으로 오판되지 않게 처리. 365일 전
로그인 회원/335일 전 로그인 회원을 DB에 직접 세팅→cron 호출→각각 정확히
1건씩 전환/경고 처리되고 재호출 시 중복 전환 안 되는지 확인. **휴면
해제(재로그인 복구) 플로우는 스코프아웃** — 레거시가 `nondormant_time`
컬럼과 별도 재활성화 화면을 갖춘 완전히 다른 기능이라 이번 범위에 넣지
않음(`MemberSleep`엔 컬럼만 포팅, 로직 없음).

**배송추적 폴링**(`packages/core/src/delivery-tracker.ts`): `payment.ts`의
`PaymentGateway`/`getPaymentGateway()`와 동일한 "자격증명 없으면 폴백" 구조 —
`DeliveryTrackerProvider` 인터페이스, `NoopDeliveryTracker`(기본값),
`SweetTrackerProvider`(실제 스윗트래커 API, `SWEETTRACKER_API_KEY` 있을 때만
생성). 배송중(`status===3`)이고 `delivery_info`(`"택배사|송장번호"` 포맷,
`updateDeliveryProgress`가 이미 이 포맷으로 저장)가 채워진 라인을 폴링,
배송완료 확인 시 기존 `orderStatus4()`를 그대로 호출. 개발환경엔 실키가 없어
Noop 경로만 실제 테스트 가능(배송중 주문 세팅→호출→`checked` 카운트는
정확하지만 `delivered:0`, 주문 상태 불변 확인) — 실제 스윗트래커 연동은
"나중에 확인" 항목으로 문서화(Phase 5의 아론허브 실키 미검증과 동일 패턴).

**스코프 제외 항목**: 휴면회원 재활성화(위 참고), 전체 112개 템플릿 픽셀
diff 스윕(레거시 참조 환경 부재), 스윗트래커 실키 연동 미검증(아래 "나중에
확인" 참고).

**이번 Phase의 새 테이블**: `mallRN_member_sleep`(레거시 DDL 그대로) —
`packages/db/sql/013_phase9_member_sleep.sql`.

**Playwright E2E로 실제 검증 완료**: 2차원 옵션 조합(등록→상품상세 선택→
가격/품절→주문), XSS 인젝션 시도(상품/벤더설정, alert 미발생+안전 태그 보존
확인), cron 일일배치(쿠폰/마일리지/기획전/휴면회원 전체, 멱등성 포함), 배송추적
폴링(Noop 경로), 그리고 이번 Phase가 건드리지 않은 기존 화면들(홈/목록/상세/
장바구니/게시판/스토어/admin·vendor 대시보드 전체)이 회귀 없이 200으로
렌더링되는지 스팟체크. vitest는 sanitizeRichText 6개 케이스 추가로 63개 전체
통과.

## 마이그레이션 완결성 감사 (2026-08-08 재검토)

Phase 9까지 끝낸 뒤 "레거시 기준으로 정말 빠진 게 없는지"를 별도로 재검토한
결과입니다. 각 Phase 진행 중에는 사용자와 스코프를 논의한 항목만 "미뤄둔
것"에 기록됐는데, 이 재검토에서 **애초에 논의 테이블에 올라온 적도 없어서
스코프컷인지 단순 누락인지조차 구분 안 됐던 레거시 기능들**이 대량으로
발견됐습니다. 아래는 그 목록 — 버그가 아니라 "존재를 몰랐던 gap"이므로
기존 "미뤄둔 것" 섹션과 층위가 다릅니다.

**처리 방침(2026-08-08 확정)**: 사용자가 "공식적으로 이행 안 해도 된다고 한
것은 없다, 발견된 것 전부 이행해야 한다"고 명시적으로 지시함 — 아래 목록은
전부 구현 대상이며, 우선순위 높은 순으로(스토어프론트/입점사 필수 기능 →
관리자 핵심 운영 → 로그/감사 스키마 → 상품 진열/일괄관리 → 통계 → 환경설정 →
인프라/SEO) 그룹 A~I로 나눠 순차 진행 중. 완료된 항목은 `~~취소선~~` +
"✅ 그룹X"로 표시. 상세 계획은 세션 로컬 플랜 파일(`smooth-finding-ullman`)
참고, 다음 세션은 [[migration_completeness_audit]] 메모리로 진행 상황 파악.

### 스토어프론트(고객 화면) — 사용자 임팩트 큼

- ~~**아이디/비밀번호 찾기 전체 부재**~~ ✅ 그룹A: `findMemberId`/
  `requestPasswordResetCode`/`verifyPasswordResetCode`/`resetPasswordWithCode`
  (member.ts, 기존 `auth_code`/`auth_code_time` 컬럼 재사용) + `/id_search`,
  `/passwd_search` 라우트, `LoginForm.tsx` 링크 추가.
- ~~**`/cs_center` 죽은 링크**~~ ✅ 그룹A: 기존 함수만 조합(`getShopConfig`+
  `getPostList("notice")`+FAQ 카테고리)해 신규 core 로직 없이 구현.
- ~~**마이페이지 하위 3개 조회 화면 부재**~~ ✅ 그룹C: `/my_coupon`,
  `/my_mileage`, `/my_counsel` 추가, `mypage/page.tsx`에 링크 연결.
- ~~**우편번호/주소 검색 미구현**~~ ✅ 그룹A: 다음 우편번호 무료 위젯
  (`PostcodeSearchButton.tsx`, `next/script` lazyOnload) 스토어프론트+
  백오피스 양쪽에 추가.
- 네이버페이 상품 피드(`naverGoodsXml.php` 등 4개 엔드포인트) — UI 버튼만
  스코프아웃으로 문서화됐었는데 서버측 피드 자체도 없음. (미착수, 그룹I)
- ~~가입완료 전용 페이지(`regist_ok.php`)~~ ✅ 그룹A: `/regist/complete`
  신설, `app/regist/actions.ts`의 리다이렉트 대상 변경. 엑셀 대량 장바구니
  담기(`goods_excel_cart_json.php`)는 여전히 미착수(확인 필요).

### 관리자 백엔드 — 운영 임팩트 큼

- ~~**통계 화면 대부분 부재**~~ ✅ 그룹G: 마진통계(`/stats/margin`),
  회원통계(`/stats/members`), 상품랭킹(`/stats/goods-ranking` —
  판매금액/판매수량/관심상품저장수), 마일리지통계(`/stats/mileage`) 추가.
  레거시 대비 스코프 축소 3가지(admin-stats.ts에 문서화): PC/모바일 분리와
  매출유형별(상품/배송비/마일리지/쿠폰/할인/CP수수료) 세분화 없음(Phase 8이
  이미 `OrderSales`를 그 컬럼들 없이 재설계함), 상품랭킹의 "클릭수" 열 없음
  (이 마이그레이션 전체에 클릭/조회 로그 인프라가 아예 없음), 회원통계의
  "탈퇴" 시계열 없음(`withdrawMember()`가 감사테이블 없이 하드삭제 —
  완결성 감사에서 이미 검토·인정된 결정).
- ~~**쿠폰 관리 CRUD 전체 부재**~~ ✅ 그룹D: `createCouponManager`/
  `updateCouponManager`/`getCouponManagerList`(`useType` — 고정일자/상대일수
  만료 분기 유지) 추가, `/coupons` CRUD 화면 신설.
- ~~마일리지 내역/삭제로그 조회 화면~~ ✅ 그룹D+E: `/mileage-log` 조회 화면
  + 소프트삭제(`deleted`/`deleted_proc_id`/`deleted_proc_ip`/`deleted_date`
  컬럼, 레거시의 별도 스냅샷 테이블 대신 원본 행 플래그 방식으로 단순화)/
  복구 버튼.
- ~~**관리자/입점사 접속(행위)로그 부재**~~ ✅ 그룹E: `AccessLog`(관리자+
  입점사 로그 통합, `actorType` 판별 컬럼 — 레거시 두 테이블이 컬럼 100%
  동일해서 병합) 신설, `/access-log` 조회 화면, 로그인/로그아웃 지점에 기록.
- ~~SMS 발송이력 조회~~ ✅ 그룹D: `/sms-log` 조회 화면(`SmsLog`는 Phase 5부터
  존재). ~~자동메일 템플릿 관리~~ ✅ 그룹I: `AutoMail` 테이블 +
  `/mail-templates` 화면, `mailer.ts`의 4개 렌더러가 `{TOKEN}` 치환으로
  DB 커스텀 템플릿을 우선 사용(레거시의 `{LOOP_*}` 중첩 루프 템플릿 엔진은
  이식 안 함 — 상품/벤더 목록은 계속 서버 렌더링된 HTML을 토큰 하나로 전달).
- ~~환경설정 4종 부재~~ 그룹H에서 3/4 처리, 1개는 의도적 스코프컷:
  - ✅ 회원정책(`/settings/member`): 가입항목 필수여부/이메일·SMS수신동의/
    자동승인/로그인제한 + **소셜로그인 admin/api_id/api_key 설정**(Phase 3
    "구조만"이던 `ConfigurationSocial`을 완성 — 읽기는 이미 있었는데 쓰는 화면이
    없어서 버튼이 계속 숨어있었음).
  - ✅ 회원등급설정(`/settings/member-levels`): `MemberLevel`의 name/discount/
    mileage/delivery_free/price(자동승급 기준금액)/coupon_uid(승급쿠폰) CRUD.
  - ✅ 상품환경설정(`/settings/goods`): 가격제한 + 직영상품 공통 배송/환불/
    교환/AS 안내문구(정보 없어 상품 자체 필드로 조용히 폴백되던 gap을 해소).
  - ~~기타정책(`etcs_info.php`)~~ **의도적 스코프컷**: 필드 전부(주문취소/
    안내메시지 목록, 자동배송완료/구매확정 일수, SMS 자격증명, 스마트 택배조회
    키)를 확인한 결과 이 저장소에서 실제로 읽는 코드가 하나도 없음 — SMS는
    `.env`(`sms.ts`), 배송조회는 `.env`(`SWEETTRACKER_API_KEY`,
    `delivery-tracker.ts`)로 이미 자격증명을 받고, 자동완료 배치 자체가
    미구현, 취소사유 드롭다운도 없음. 아무도 안 읽는 컬럼에 입력 화면만
    만들면 관리자가 "이게 뭔가 동작한다"고 오인하게 되므로 미구현 유지.
- ~~회원등급 **자동평가/일괄산정**~~ ✅ 그룹H: `recalculateMemberLevels()`
  — 레거시는 `mallRN_order_sales`의 type/status/confirmation으로 집계하는데
  Phase 8이 그 컬럼들 없이 재설계해서(그룹G 참고) 대신 `OrderInfo.pay_total`을
  회원별로 합산. `MemberLevel.price`/`coupon_uid`는 계속 죽어있던 컬럼이었는데
  이제 실제로 쓰임.
- ~~**휴면회원 관리자 조회 화면 부재**~~ ✅ 그룹D: `/member-sleep` 조회 화면
  신설. 재활성화(해제) 버튼은 레거시의 완전히 다른 인증 플로우라 계속 스코프컷
  유지([[migration_deferred_items]] 참고).
- ~~상품 진열관리/가격·재고 일괄수정/엑셀 일괄등록~~ ✅ 그룹F(F1-F5): `/goods/display`
  (main1/main2/store 3슬롯 — store는 처음엔 스코프컷했다가 사용자 질문으로
  재검토 후 구현, [[migration_deferred_items]] 참고), `/goods/bulk-edit`,
  `/goods/import`(exceljs, 23컬럼 위치기반 매핑, SSRF-safe 이미지 URL 다운로드) +
  벤더용 `/vendor/goods/display`, `/vendor/goods/bulk-edit`, `/vendor/goods/import`
  (레거시 `vendor/goods/goods_adds.php`도 동일 기능 보유 — 이 감사가 처음엔
  "엑셀등록은 admin 전용"이라고 잘못 적었던 걸 소스 직접 확인으로 정정).
- ~~주문 목록에 **진행단계별 필터**~~ ✅ 그룹D: `status` 필터 추가
  (`order-admin.ts`의 `AdminOrderListFilters`).
- ~~DB 에러로그 조회, 배송추적 API 호출 로그 조회~~ ✅ 그룹E: `DbErrorLog`
  (cron 두 라우트의 catch 블록에서 best-effort 기록), `DeliveryApiLog`
  (`pollDeliveryTracking`이 매 폴링마다 기록) + 각각 조회 화면.
- ~~회원 엑셀 일괄등록~~ ✅ 그룹H(H4): `/members/import`, F4(상품 엑셀
  일괄등록)와 동일한 위치기반 컬럼/exceljs 방식. MD5 평문저장 체크박스(레거시)
  대신 항상 argon2id 해시, job/hobby 마스터값 검증은 그 마스터리스트 자체가
  이 저장소에 없어서 자유 텍스트로 통과.

### 입점사 백엔드 — 운영 임팩트 큼

- ~~**업체정보관리 화면 부재(`vendor_info.php`) — 가장 심각**~~ ✅ 그룹B:
  `getVendorInfo`/`updateVendorInfo`(정산 입금계좌 포함) + `/vendor/profile`
  화면. 사업자등록증/통장사본 이미지는 레거시와 달리 공개 경로가 아닌 비공개
  디렉토리+세션게이팅 라우트로 서빙(레거시의 PII 노출 결함 개선).
- ~~벤더 비밀번호 변경 기능 부재~~ ✅ 그룹B: `changeVendorPassword` +
  `/vendor/profile`의 비밀번호 변경 폼.
- ~~브랜드/제조사/원산지 **마스터 값 관리**~~ ✅ 그룹H(H5): `/vendor/store`에
  줄바꿈 구분 텍스트영역 3개 추가, `GoodsForm`의 브랜드/제조사/원산지
  입력창에 `<datalist>` 자동완성으로 연결(강제 선택 아님 — 자유 입력 그대로
  가능). `goods_option_info`(옵션명 마스터값)는 제외 — 이 저장소의
  `GoodsOptionBuilder`는 옵션명도 자유 텍스트라 연결할 곳이 없음.
- ~~상품 진열관리/일괄수정/엑셀등록~~ ✅ 그룹F: `/vendor/goods/display`
  (main1/main2와 동일한 슬롯 시스템에 `store` 슬롯 추가, 벤더 소유권 검증 포함),
  `/vendor/goods/bulk-edit`(F5), `/vendor/goods/import`(F4 — 처음엔 "레거시도
  vendor 쪽엔 없음"이라 적었으나 `vendor/goods/goods_post.php`의 `case "excel"`을
  직접 확인해 정정, admin과 동일 로직 재사용 + `session.vendorId` 강제).
  **`store_display`(스토어 페이지 인기/추천/신상품 하이라이트)는 처음엔
  "VendorConfiguration 테이블 없음"을 근거로 스코프컷했다가, 사용자가 직접
  "왜 스코프아웃됐나" 질문 → 그 근거가 Phase 8 이후 스테일해진 것으로 확인 →
  사용자 지시로 즉시 구현**: `store.ts`의 `getStoreSections()` + `/vendor/store`에
  진열 타입 select 3개([[migration_deferred_items]] 참고). 상품랭킹통계는
  admin `/stats/goods-ranking`으로 처리 완료(그룹G, 벤더별 필터는 없음 —
  admin 전용 화면 하나로 충분하다고 판단).
- ~~**매출통계/매출상세**, **정산통계/정산상세**~~ ✅ 그룹G:
  `/vendor/stats/sales`+`/sales-detail`(signdate 기준, 확정여부 무관 —
  `sales_statistics.php`/`sales_detail.php` 대응), `/vendor/stats/settlement`+
  `/settlement-detail`(confirm_date 기준, confirmed=1만 — `calculate_statistics.php`/
  `calculate_detail.php` 대응). `/vendor/settlement`(정산내역 목록,
  `calculate_list.php` 대응)는 Phase 8부터 별도로 존재.

### 인프라/SEO/데이터 모델

- ~~**네이버/다음 쇼핑 피드 설정 필드가 스키마에 있는데 아무도 안 읽음**~~
  ✅ 그룹I: `/feed/naver`, `/feed/daum`(RSS 2.0 + Google-Shopping류 `<g:*>`
  네임스페이스 — 두 채널이 공통으로 받는 최소공배수 포맷, 레거시처럼 채널별
  전용 스키마 2벌을 따로 만들지 않음)이 `Configuration.goods_engine_naver`/
  `goods_engine_daum`(설정 화면 토글, 그룹H `/settings/goods`와 함께 추가)/
  `Goods.engine_use`(상품등록 화면 체크박스)를 실제로 읽음 — 셋 다 이번에
  처음으로 소비자가 생김.
- ~~`sitemap.ts`/`robots.ts` 부재~~ ✅ 그룹I: Next 메타데이터 라우트 컨벤션으로
  상품/카테고리/스토어/기획전/게시글 URL 전부 포함.
- ~~**`mallRN_delivery_api_log` 테이블이 스키마에 없음**~~ ✅ 그룹E:
  `DeliveryApiLog` 추가, `pollDeliveryTracking`이 매 폴링마다 기록 + 조회 화면.
- ~~감사로그 테이블 5종 미이식~~ ✅ 그룹E(`packages/db/sql/015_completeness_logs.sql`):
  `mallRN_admin_log`+`mallRN_vendor_log` → `AccessLog` 하나로 통합(컬럼 100%
  동일해서 병합, `actorType` 판별 컬럼), `mallRN_mileage_log` → 별도 테이블
  대신 `Mileage`에 소프트삭제 컬럼 추가하는 방식으로 단순화,
  `mallRN_order_cancel_cp_log` → `OrderCancelCpLog`(레거시 DDL 그대로),
  `mallRN_db_error_log` → `DbErrorLog`(id 액터 컬럼 등 일부 단순화). 5종 전부
  대응하는 관리자 조회 화면 포함.
- ~~`mallRN_admin_configuration`(관리자별 대시보드 위젯 배치)~~ ✅ 그룹I:
  `AdminConfiguration.widget_info`(JSON) + 대시보드의 표시/숨김+순서 UI.
  FCM 웹푸시 토큰 컬럼(`push_yn`/`token_pc`/`token_mobile`)은 계속 스코프아웃
  유지(이미 문서화됨).
- **의도적 스코프컷**: `mallRN_list_show_config`(관리자 목록 화면 노출 컬럼
  커스터마이징) — 계획 수립 단계에서부터 "레거시 `varchar(250)` 직렬화가
  이미 한계에 근접해 그대로 포팅할 가치가 낮다"고 판단한 항목. 구현하려면
  admin/goods, /members, /orders 등 여러 목록 화면 각각에 컬럼 표시/숨김
  분기를 추가해야 해서 비용 대비 가치가 낮음 — 스킵.
- ~~회원/주문/상품 **엑셀 다운로드** 기능~~ ✅: 각 목록 화면(`/goods`,
  `/members`, `/orders`)의 현재 검색조건을 그대로 반영해 `.xlsx`로 내려받는
  버튼 + `/*/export` 라우트 추가(exceljs, 최대 5000행 캡). 각 리스트 함수의
  필터 로직을 페이지네이션 없이 재사용.

### 이번 감사에서 재확인해 "정상"으로 결론 내린 것

리뷰, 소셜로그인 미설정(구조만 존재), 방문자/키워드 통계, KCP/나이스페이/
이니시스, 세금계산서/정산상태 토글, 휴면회원 재활성화, 게시판 정규화,
대시보드 위젯 20종, 탈퇴회원 목록, `async_*.php` 4개 전수 확인(누락 없음) —
전부 기존 "미뤄둔 것" 섹션 서술과 일치함을 재확인.

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

### 휴면회원 (`mallRN_member_sleep`) — ✅ Phase 9에서 처리
전환/경고메일까지 완료, 상세는 위 "Phase 9 완료 요약" 참고. **휴면 해제
(재로그인 복구) 플로우는 스코프아웃** — 레거시가 `nondormant_time` 컬럼과
별도 재활성화 화면을 갖춘 완전히 다른 기능이라 이번 범위에 넣지 않음.

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
미착수라 `answer`는 항상 빈 값("답변대기중")으로만 보임 — Phase 7은 게시판 엔진의
counsel(1:1문의 게시판, `board.ts`)만 admin 답변 기능을 추가했고, 이 `mallRN_inquiry`
(상품문의, 게시판과 무관한 별도 테이블)는 범위에 포함되지 않았음. Phase 8도
입점신청/상품/주문/정산/스토어설정만 승인된 스코프라 상품문의 답변 UI는 여전히
미착수 — 9단계 계획 완료 이후 별도 스코프로 재검토 필요.

### 카트/주문 — ✅ Phase 4에서 처리
`mallRN_cart`/`mallRN_order_info`/`mallRN_order_goods`/`mallRN_order_log`/
`mallRN_order_delivery`/`mallRN_coupon`/`mallRN_coupon_manager`/`mallRN_mileage`
테이블 추가 + `packages/core/src/cart.ts`/`coupon.ts`/`mileage.ts`/`order.ts` +
`/cart`, `/order`, `/order/complete`, `/my_order`, `/my_order/[order_num]`,
`/my_order/guest` 페이지. 장바구니 담기(옵션 선택 포함)부터 결제, 주문내역 조회,
취소까지 실사용 가능. **단순화/스코프컷한 부분**:
- **결제수단은 무통장입금(B)/마일리지 전액결제(M)/카드(C)/휴대폰(H)** — 실시간계좌이체/
  가상계좌는 아론허브가 지원하지 않아(아래 "결제(PG)/알림" 항목 참고) 여전히 미지원.
- ~~무통장입금은 레거시처럼 입금대기(status=0)로 남김~~ — ✅ Phase 7에서 처리
  (`confirmBankTransferPayment`, admin이 `/orders/[orderNum]`에서 "입금확인" 클릭).
- ~~배송상태 진행(배송준비중/배송중/배송완료)과 구매확정은 전부 Phase 7/8 대기~~ —
  ✅ Phase 7에서 처리(`orderStatus4`/`orderStatus5`/`updateDeliveryProgress`,
  admin `/orders/[orderNum]`에서 호출. 마일리지 적립 로직도 여기서 처음 실사용
  검증됨).
- ~~부분환불(`orderStatus95_partial`)은 스코프아웃~~ — ✅ Phase 7에서 처리
  (`partialRefundOrder`, 전역변수 계약을 명시적 인자로 재설계 — Phase 7 완료 요약
  참고). 전액취소(`orderStatus9`/`orderStatus95`)도 계속 지원.
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
- ~~**[Phase 7] 무통장입금 → 결제완료 전환 경로 없음.**~~ ✅ Phase 7에서 처리
  (`confirmBankTransferPayment`).
- ~~**[Phase 7] `orderStatus95`가 B 주문 실사용 경로로 검증되지 않음.**~~ ✅ Phase 7
  Playwright E2E로 B 주문 입금확인→전체취소 경로까지 확인 완료.
- ~~**[Phase 7/8] `orderStatus4`/`orderStatus5` 호출 지점 없음.**~~ ✅ Phase 7에서
  admin `/orders/[orderNum]` 화면에 연결, 마일리지 적립까지 DB 대조로 검증 완료.
- ~~**[Phase 5] 카드/PG 결제 경로.**~~ ✅ Phase 5에서 아론허브(C/H)로 처리됨 — 아래
  "결제(PG)/알림" 항목 참고.
- ~~**[발견 시] 부분환불 재검토.**~~ ✅ Phase 7에서 `partialRefundOrder`로 처리
  (전역변수 계약 대신 명시적 인자로 재설계 — Phase 7 완료 요약 참고).
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
- ~~배송완료/구매확정 알림 없음~~ — Phase 7에서 `orderStatus4/5`에 admin UI가
  연결됐지만, 이 두 전환 자체에 대한 별도 SMS/이메일 알림은 레거시에도 없어
  추가하지 않음(주문접수/결제완료 알림만 유지, 배송 시작 시점 SMS는 Phase 7의
  `updateDeliveryProgress`가 새로 추가함 — 아래 Phase 7 완료 요약 참고).
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
- ~~**[Phase 7] 무통장입금 결제완료 시에도 `notifyOrderPaid` 연결 필요.**~~ ✅
  Phase 7의 `confirmBankTransferPayment`가 `orderStatus1` 호출 직후
  `notifyOrderPaid`도 함께 호출하도록 구현됨.

### 회원등급 할인가 — ✅ Phase 3에서 처리
`packages/core/src/member.ts`의 `getMemberDiscountPct()` + `pricing.ts`의
`getGoodsPrice()`가 로그인 회원의 `MemberLevel.discount`를 실제로 적용함(홈/목록/
검색/베스트/신상/모음전/스토어/상품상세 전부 반영). 쿠폰 적용가는 ✅ Phase 4에서
`coupon.ts`로 처리됨(위 "카트/주문" 항목 참고).

### 입점사 사이트 설정 (`mallRN_vendor_configuration`) — ✅ Phase 8에서 처리
CS시간/반품지주소/상품 기본 안내문구(배송·환불·교환·AS)만 vendor가 편집.
노출순서 커스터마이징 등 디자인 컬럼은 여전히 admin/vendor UI 없이 미사용 —
상세는 위 "Phase 8 완료 요약" 참고.

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
- ~~옵션 2개 이상 조합가/조합재고 조회~~ — ✅ Phase 9에서 처리. 스키마/
  `cart.ts` 무변경으로 해결(상세는 "Phase 9 완료 요약" 참고) — 레거시처럼 별도
  AJAX 팝업이 아니라 인라인 다차원 피커로 구현.
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

### 게시판/CMS — ✅ Phase 6에서 처리, 관리자 답변/작성은 ✅ Phase 7에서 처리
notice/faq/counsel/gallery 4개만 구현. 판매사 전용 게시판(vnotice/vcounsel)은
Phase 8에서 벤더 로그인이 생겼지만 승인된 스코프에 없어 여전히 미착수(9단계
계획 완료 이후 별도 스코프로 재검토 필요). ~~게시글
수정/삭제 기능은 스코프아웃(v1)~~ — ✅ Phase 7에서 admin 전용으로 추가
(`updatePost`/`deletePost`); **고객 쪽 수정/삭제는 여전히 스코프아웃**
(`inquiry.ts`도 없다는 기존 전례를 따름). 게시판별 관리 권한
(`mallRN_board_manager`)도 테이블 없이 `BOARD_CONFIG` TS 상수로 하드코딩(관리
UI 자체가 없다는 원칙은 유지 — `commentAuthor` 필드로 counsel 답변만 admin
전용으로 게이팅). 상세는 위 "Phase 6/7 완료 요약" 참고.

**[나중에 확인]** `/agreement`·`/privacy`의 `{JOINFORM}`/`{DELIVERYNAME}`/
`{PGNAME}` 플레이스홀더는 각각 `member_config`의 회원가입 항목 토글, 배송사
목록, PG사명에 의존하는데 아직 포팅되지 않아 빈 문자열(JOINFORM/DELIVERYNAME)
또는 하드코딩된 상수(PGNAME="NHN한국사이버결제 주식회사")로 대체함 — 해당
테이블/설정 UI가 생기면 다시 확인할 것.

### 관리자 백엔드 — ✅ Phase 7에서 처리
상세는 위 "Phase 7 완료 요약" 참고. 방문자/키워드 통계, 배송송장 엑셀
일괄업로드, 대시보드 위젯 20종, 탈퇴회원 목록(감사 테이블 없음)은 스코프아웃
— 각 항목의 이유는 Phase 7 완료 요약 하단 참고.

### 입점사 백엔드 — ✅ Phase 8에서 처리
상세는 위 "Phase 8 완료 요약" 참고. 세금계산서 발행여부/정산상태 수동토글,
정산유형(현금/계좌) 구분, 판매사 전용 게시판(vnotice/vcounsel), 입점사
대시보드 위젯(admin 위젯의 vendor 필터판), 상품 승인대기 알림(admin에게
푸시/이메일 알림 없이 `/goods?pending=1` 필터로만 확인)은 스코프아웃.

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
- **(Phase 7부터) 관리자 화면 검증은 `apps/storefront`(3000)와 `apps/backoffice`
  (3001) 두 dev 서버를 동시에 띄워야 함** — 상품/배너/팝업 이미지가 backoffice에서
  storefront의 `public/`으로 업로드되므로, storefront가 안 떠 있으면 업로드는
  성공해도 결과를 확인할 수 없음.
- **`<form>` 안에 다른 `<form>`을 중첩하면 안 됨(잘못된 HTML)** — React가
  hydration mismatch로 감지해 클라이언트에서 트리를 통째로 재생성하며, 안쪽
  `<form>`의 서버 액션이 조용히 동작하지 않는 것처럼 보일 수 있음(Phase 7에서
  실제로 겪음: 카테고리 관리 화면의 수정 폼 안에 삭제 폼을 넣었다가 발견). 같은
  행에 독립된 액션 두 개가 필요하면 형제 `<form>`으로 분리할 것 — 여러 `<button
  type="submit" name="..." value="...">`를 한 폼 안에 두는 것(입점사 승인/거절
  버튼 등)은 유효한 HTML이라 문제 없음.
- **admin 계정은 `apps/backoffice`에서 로그인**(`id=admin`/`password=admin1234`,
  시드에 포함) — 세션 쿠키 이름이 storefront와 다르므로(`shoppingmall_admin_
  session`) 두 앱에 동시에 다른 사용자로 로그인해 있어도 서로 간섭하지 않음.

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
8. `pnpm exec tsc --noEmit` (packages/core, packages/db, apps/storefront,
   apps/backoffice 각각 — Phase 7부터 backoffice도 추가)

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
