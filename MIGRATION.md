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
| 4 | 카트/주문 엔진 | ⬜ **다음 작업** (아래 가이드 참고) |
| 5 | 결제/알림 | ⬜ 미착수 |
| 6 | 게시판/CMS | ⬜ 미착수 |
| 7 | 관리자 백엔드 | ⬜ 미착수 |
| 8 | 입점사 백엔드 | ⬜ 미착수 |
| 9 | 하드닝/정규화/마무리 | ⬜ 미착수 |

커밋 로그가 각 Phase의 실제 작업 내역이니 `git log`로 확인하세요.

## 다음 작업: Phase 4 (카트/주문 엔진) 시작 가이드

**목표**: 장바구니 담기 → 주문서 작성 → 주문 완료까지의 실제 파이프라인. PG 연동
자체는 Phase 5이므로, Phase 4의 "결제"는 즉시 완료 처리되는 방법(예: 무통장입금)만
우선 동작시키고 실제 카드/PG 결제 버튼은 Phase 5까지 비활성 상태로 두면 됩니다.

**주요 레거시 참고 파일** (`../shoppingmall_php`):
- `php/cart.php` — 장바구니 조회/수량변경/삭제
- `php/order.php` — 주문서 작성 화면(배송지, 결제수단, 쿠폰/마일리지 적용)
- `php/order_post.php` — 주문 생성 처리
- `php/order_list.php`, `order_list_view.php` — 주문내역 목록/상세
- `lib/lib.Shop.php`의 핵심 함수 (3160줄, 이 저장소에서 가장 위험도 높은 로직):
  - `checkCartOrder` — 주문 가능 여부 검증(재고/구매제한/회원등급 등)
  - `orderStatus1/4/5/9/95/95_partial` — 주문 상태 전이 상태머신(결제완료/배송중/
    배송완료/취소/환불/부분환불)
  - `orderReset` — 주문 취소 시 재고/마일리지/쿠폰 롤백
  - `goodsOrderQtyChange`/`goodsOrderQtyCancel` — 재고 증감
  - `couponIssuance` — 쿠폰 발급/차감
  - `mileageChange*` — 마일리지 적립/차감

**새로 필요한 테이블** (`install_post.php` DDL을 그대로 가져와 introspect하는 기존
패턴 그대로):
- `mallRN_cart` — 장바구니
- `mallRN_order_info` / `mallRN_order_goods` / `mallRN_order_log` — 주문/주문상품/로그
- `mallRN_coupon` / `mallRN_coupon_manager` — 쿠폰. Phase 3에서 "쿠폰 적용가
  미구현"으로 미뤄둔 부분이 이 Phase에서 함께 풀립니다(회원등급 할인은 이미 완료).

**주의할 점**:
- 계획 문서(`~/.claude/plans/hazy-prancing-reddy.md`)에 명시된 대로, 이 상태머신은
  돈/재고/마일리지/쿠폰이 한 트랜잭션처럼 같이 움직이는 전체 계획 중 최고 위험도
  로직입니다 — 결제 연동(Phase 5) 전에 단위 테스트로 상태 전이를 먼저 검증하세요.
- 리뷰(`mallRN_review`, 지금까지 계속 미뤄둔 항목)는 `og_uid`(주문상품 고유값)가
  있어야 작성 가능한 구조라, 이 Phase에서 주문 테이블이 생기면 자연스럽게 같이 풀립니다.
- 게스트 장바구니를 지원하려면 여러 곳에서 "게스트 식별용 `cart_id` 쿠키 필요"로
  미뤄둔 인프라(최근본상품, 조회수 증가)를 이 Phase에서 만들 좋은 기회입니다. 단,
  찜하기/상품문의 등은 이미 회원 전용으로 구현이 끝났으니 `cart_id`는 순수 게스트
  장바구니 전용으로만 필요합니다.

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
- **결제**: KCP(컴파일 바이너리+SOAP)는 스텁, aronhub→nicepay→inicis 순으로 실제 구현.
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
있음. aronhub(최근 커밋 기준 실사용 중)를 먼저 구현.

### 휴면회원 (`mallRN_member_sleep`)
테이블 자체를 안 만듦 — 휴면 전환은 스케줄 작업(`async_day_proc.php`, Phase 9)이
있어야 의미가 있는데 아직 그 인프라가 없음.

### 리뷰 (`mallRN_review`)
아직 테이블 없음. 레거시 `review_post.php`가 `og_uid`(주문상품 고유값)를 필수값으로
요구 — 실제 구매 이력에 묶인 후기라 Phase 4(주문 엔진)의 `order_goods` 테이블 없이는
의미 있게 구현할 수 없음. 상품상세 페이지는 항상 카운트 0/빈 상태 텍스트만 표시.

### 상품문의 — ✅ Phase 3에서 처리
`mallRN_inquiry` 테이블 추가 + `packages/core/src/inquiry.ts` + 상품상세 페이지의
문의 탭(작성/목록, 비밀글 게이팅) + `/my_inquiry`(내 문의내역). **회원 전용으로
단순화**: 레거시는 비회원도 비밀번호 입력으로 작성 가능(`mallRN_inquiry.passwd`,
`popup_passwd.php`)하지만, 이 저장소는 이미 완성된 회원 인증(Phase 3)만 사용 —
비회원 비밀번호 검증 플로우는 구현하지 않음. 답변 작성(관리자/입점사 UI)은 여전히
Phase 7/8 대기 중이라 `answer`는 항상 빈 값("답변대기중")으로만 보임.

### 카트/주문
장바구니/바로구매 버튼은 렌더링되지만 클릭해도 "준비 중입니다" 알림만 뜨는 no-op
(Phase 4에서 실제 구현).

### 회원등급 할인가 — ✅ Phase 3에서 처리
`packages/core/src/member.ts`의 `getMemberDiscountPct()` + `pricing.ts`의
`getGoodsPrice()`가 로그인 회원의 `MemberLevel.discount`를 실제로 적용함(홈/목록/
검색/베스트/신상/모음전/스토어/상품상세 전부 반영). **쿠폰 적용가는 여전히 미구현** —
`mallRN_coupon`/`mallRN_coupon_manager` 테이블이 없고, 쿠폰 발급/차감이 카트·주문
흐름과 묶여 있어 Phase 4 이후 처리.

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
- 최근본상품 드로어, 퀵메뉴 플로팅 버튼 — 여전히 `cart_id` 게스트 쿠키 인프라 필요.
- 네이버페이 버튼
- 상단 네비 JS 폭 균등분배 (CSS padding으로 단순 대체)

### 상품상세 (Phase 2)
- 옵션 2개 이상 조합가/조합재고 조회 (첫 번째 옵션만 실제 값 노출) — 레거시도 AJAX
  팝업으로 카트 엔진과 맞물려 있어 Phase 4와 함께 처리.
- ~~찜하기(즐겨찾기 상품/스토어)~~ — ✅ Phase 3에서 처리. `mallRN_favorite_goods`/
  `mallRN_favorite_store` 테이블 + `packages/core/src/favorite.ts` + 상품상세/
  스토어 페이지의 하트 버튼(토글, 100개 캡 포함) + `/my_favorite_goods`,
  `/my_favorite_store`. 레거시와 동일하게 회원 전용(비회원은 로그인 페이지로 이동).
- 조회수 증가/최근본상품 기록 (게스트 식별용 `cart_id` 쿠키 인프라 필요)
- ~~"이 판매자의 인기상품" 섹션~~ — ✅ Phase 3에서 처리. `detail.ts`의
  `vendorGoods`(`store_display1/2/3` 우선순위 + `order_cnt` 타이브레이커, 현재 상품
  제외, 최대 6개) + 관심스토어 하트 버튼. 상품에 `vendor`가 없으면(직영 상품)
  레거시처럼 렌더링 자체를 생략.

### 검색/목록 UX 단순화
- 페이지네이션: 레거시의 `jquery.timeliny.js` "pageline" 스크러버 대신 번호형 페이지네이션
- "결과 내 검색": 다중 키워드 AND 좁히기 대신 단일 키워드로 단순화

### 게시판/CMS, 관리자 백엔드, 입점사 백엔드
Phase 6/7/8 — 전체 미착수.

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
