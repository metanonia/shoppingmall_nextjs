# 스토어프론트 화면 재검증 조사 결과 (2026-08-08)

이 문서는 `shoppingmall_php`(레거시) 고객 화면 전체(`php/*.php` 95개 + `board/*.php`
10개, 총 105개 파일)와 `shoppingmall_nextjs`(신규) 포팅 결과를 **화면 단위/필드
단위**로 재대조한 조사 결과다. `MIGRATION.md`의 "마이그레이션 완결성 감사"
(2026-08-08)가 이미 스코프 논의 자체가 없었던 대형 gap들을 찾아 그룹 A~I로
처리했는데, 이번 조사는 그 감사 **이후**에 "화면은 존재하는데 필드/검증/문구가
미세하게 다르거나 빠진" 더 세밀한 불일치를 찾는 게 목적이다. 코드 수정은 하지
않았고 순수 조사만 수행했다.

## 방법론

105개 레거시 파일을 6개 그룹(G1 홈/공통/상품탐색 20개, G2 카트/주문 23개, G3
회원/인증 25개, G4 마이페이지·리뷰·문의·CS 19개, G5 네이버피드·async배치 8개, G6
게시판 10개)으로 나눠 각 그룹을 독립된 조사 에이전트에 위임했다. 각 에이전트는
먼저 `MIGRATION.md` 전체(988줄)를 읽어 기존에 알려진 스코프컷/단순화 목록을
숙지한 뒤, 담당 레거시 파일을 전부 실제로 Read하고 대응하는 Next.js
페이지/컴포넌트/서버 액션/`packages/core` 로직을 Read해서 필드·검증·조건분기
단위로 대조했다.

**결과 요약**: 대응 화면 자체가 없는 "완전 미이행" 사례는 0건이었다. 대신 "화면은
있지만 그 안의 특정 필드/로직/부가기능이 빠졌다"는 유형의 미문서화 gap이 30건
이상 발견됐다. 가장 심각한 것은 실사용에 지장을 주는 버그성 항목(구매제한 상품
전원 구매불가, 무통장입금 계좌정보 누락)과 회원가입 관련 대량 필드/사이드이펙트
누락이다.

---

## 1. 문서화되지 않은 신규 발견

### G1. 홈/공통/상품탐색

1. **구매제한 상품이 전원에게 구매 불가로 막힘 (버그성, 최우선)**
   - 레거시: `php/view.php:306-319` — 비로그인 또는 한도 초과 로그인 회원만 차단,
     한도 내 로그인 회원은 정상 구매.
   - 신규: `packages/core/src/detail.ts:152` — `const memberOnly = row.limit_qty > 0`
     로 로그인 여부·잔여 구매가능수량과 무관하게 항상 `true`.
     `apps/storefront/components/ProductDetail.tsx:157-164` — `memberOnly`가
     `true`면 `CartActions`(장바구니/구매 버튼) 자체를 렌더링하지 않고 항상
     비활성 버튼 + "회원만 구매 가능 합니다." 메시지만 표시.
   - `packages/core/src/cart.ts`의 `getOrderableLimitQty`/`getOrderQty`(회원별
     실구매가능수량 계산)는 이미 정확히 구현돼 있으나 UI가 막아서 **호출될 기회가
     없는 죽은 코드**가 됨. 즉 `limit_qty>0`인 상품은 신규 저장소에서 아무도
     구매할 수 없음.

2. **마일리지 적립방식 type=1/3이 관리자 화면에서 도달 불가**
   - 레거시: `php/view.php:190-211` — mileage_type 1(샵기본율+회원가산율)/
     3(등급별 적립률) 지원.
   - 신규: `packages/core/src/goods-admin.ts:50`의 상품 등록/수정 폼이
     `mileage_type`을 `0 | 4`만 허용 — type1/3은 선택 자체가 불가능. 스키마 기본값은
     `mileage_type=1`(레거시 최다수 방식)인데 관리자가 만들 수 없음.
     `detail.ts:224`는 type=1을 항상 0으로 표시(주석: "not implemented"), type=3은
     표시 코드 자체가 없음. 반면 `order.ts:46-48`의 `calcLineMileagePct`는 type=3을
     정확히 계산 — 주문엔진만 대응하고 관리 화면이 못 만드는 불일치.

3. **추천검색어 관리자 폴백 리스트 미구현**
   - 레거시: `php/top.php:58-71` — 최근 3일 인기검색어가 10개 미만이면
     `shop_config['basic_real_keyword']`(관리자 등록 폴백 목록)로 채움.
   - 신규: `packages/core/src/search-keyword.ts`의 `getPopularKeywords()`는
     검색로그만 사용, 이 컬럼은 스키마에만 존재하고 읽는 코드가 전혀 없음(신규
     오픈/저트래픽 매장에서 추천검색어 박스가 비게 됨).

4. **연관상품 type=4(관리자 지정 목록) 완전 무시**
   - 레거시: `php/view.php:379-464` — 4가지 타입(1/2=동시구매기반, 3=카테고리,
     4=관리자가 직접 고른 uid 목록) 분기.
   - 신규: `detail.ts:229-233`은 항상 "동일 카테고리 order_cnt 내림차순"만 반환.
     `related_goods_type`/`related_goods` 필드는 `goods-admin.ts` 폼에도 노출
     안 됨 — type=4는 존재 자체가 불가능.

### G2. 카트/주문

5. **무통장입금(B) 계좌정보/입금자명 완전 누락 (가장 중요)**
   - 레거시: `order.php:280-301`(`loop_bank`, 계좌 목록 노출) +
     `order_post.php:197-199`(`remittance_bank`/`remittance_name` 입금자명 수집,
     `bank_info` 컬럼에 저장) + `order_detail.php:237-239`/`order_ok.php:27-29`
     (재파싱해서 표시).
   - 신규: `config.ts`가 `paymentBankInfo`를 매핑하지만 `footer.ts`(전역
     footer)에만 쓰임. `OrderForm.tsx`/`order/actions.ts`/`order/complete/page.tsx`/
     `my_order/[order_num]/page.tsx` 어디에도 계좌 노출·입금자명 입력·표시가
     없고, `bank_info` 문자열 자체가 `order.ts`의 `createOrder`에 등장하지 않음.
     관리자가 입금자를 주문과 매칭할 방법이 없음.

6. **배송 요청사항 프리셋 미구현**
   - 레거시: `order.php:198-207` — 관리자 등록 배송메시지 드롭다운 + 직접입력.
   - 신규: `order_message_info` 컬럼은 스키마에 있으나(`schema.prisma:191`)
     `config.ts`에 매핑조차 안 됐고 `OrderForm.tsx`는 자유 텍스트 `textarea`
     하나뿐.

7. **쿠폰 매니저 총 발급수량 캡(`use_limit2`) 미검증**
   - 레거시: `goods_coupon_down_json.php:22-26` — 캠페인 전체 발급 캡 체크.
   - 신규: `coupon.ts`의 `issueCoupon`(17-40행)은 "회원당 1회 중복발급 방지"만
     체크 — 총량 캡이 있는 쿠폰이 회원 수만큼 무제한 발급될 수 있음.

8. **취소 시 사유/환불계좌 미수집**
   - 레거시: `order_status_post.php`의 `statusX1`(185-284행) — 결제완료 후
     취소(B/V) 시 사유(필수)와 환불계좌(bank_name/num/owner, 필수) 입력 →
     관리자 승인대기(status2=1)로 접수.
   - 신규: `cancelOrderAction`/`CancelOrderButton.tsx`는 주문번호만으로 즉시
     `orderStatus95` 호출 — 사유·환불계좌 수집이 전혀 없음.

9. **고객이 자신의 택배 추적정보를 볼 수 없음**
   - 레거시: `order_list.php`의 `delivery_info_function`(161-176행) — 배송중
     상태에서 택배사 링크+송장번호 항상 노출.
   - 신규: `order.ts:813-847`의 `OrderDetailView`/`OrderLineView`에 이 필드가
     없어 `my_order/[order_num]`에서 확인 불가(저장은 되고 있음).

10. **`order_list_guest.php` 실물 확인 결과 (참고용, gap 아님)**: 실제로는
    `include_once('php/order_list.php')` 래퍼로, `guest_where` 쿠키 기반 전체
    주문 목록(페이지네이션/필터/취소·구매확정·리뷰 버튼)이었음. `/my_order/guest`가
    "단건 조회"로 단순화된 것은 이미 문서화된 스코프컷이나, 실물이 목록형이라는
    사실이 이번에 확정됨.

### G3. 회원/인증

11. **회원가입 필드 대량 누락**
    - 레거시: `regist.php` — `member_config.member_form_*` 설정에 따라
      생년월일/성별/결혼여부/직업/관심분야(다중선택)/사업자정보(회사명·사업자번호·
      대표자·주소·업태·종목)/관리자 정의 커스텀필드 5종(add1~5)/추천인까지 렌더링.
    - 신규: `RegisterMemberInput`/`RegistForm.tsx`는 tel/cell/address/mailling/sms만
      구현. 코드 주석이 "MIGRATION.md/migration_deferred_items 참고"라고 적혀
      있으나 실제로 두 문서 어디에도 이 필드 누락이 언급되지 않음(허상 참조).

12. **가입 시 사이드이펙트 전부 없음**
    - 금지 아이디(`member_config.member_unavailable_id`) 체크 없음
      (`registerMember`/`registerVendor`/`id_check_json`/`vendor_id_check_json.php`
      대응 로직 전부 누락).
    - 가입 축하 마일리지(`member_mileage_join`) 지급 없음.
    - 가입 축하 쿠폰(`coupon_manager.type=1`, 자동발급) 발급 없음 — 그룹A는
      "다운로드 쿠폰(type=4)"만 연결했다고 문서화했지만 type=1 자체가 통째로
      빠진 사실은 미문서화.
    - 가입 축하 이메일/SMS 없음 — `mailer.ts`의 AutoMail 렌더러는
      `order_received`/`passwd`/`sleep`/`order_paid` 4종뿐, 레거시의 `join`/
      `vjoin` 타입 없음.

13. **소셜 최초가입 추가정보 팝업(`popup_sns_regist.php`/`_post.php`) 전체 부재**
    - 레거시: 최초 SNS 로그인 시 팝업에서 휴대폰/생년월일/성별 + 약관 재동의를
      받고 `na_`/`ka_`/`go_`/`pa_`+타임스탬프 아이디 발급, 가입 마일리지/환영
      메일/SMS 처리.
    - 신규: `auth/[provider]/callback/route.ts`가 `findOrCreateSocialMember`를
      즉시 호출해 이 단계를 통째로 건너뛰고, `member_config.member_auth` 설정과
      무관하게 항상 즉시 로그인.

14. **승인대기 회원도 무조건 로그인시킴 (비일관)**
    - `registerMember`는 `member_auth` 설정에 따라 `auth:"N"`(승인대기)로 만들
      수 있는데, `app/regist/actions.ts`의 `registerAction`은 `auth` 값을 안
      보고 항상 `createSession()` 호출. `authenticateMember`는 `auth==="N"`이면
      로그인을 막아 가입 직후엔 들어가지지만 재로그인은 막히는 비일관 상태.
      `regist/complete/page.tsx`도 승인대기 분기가 없어 항상 "가입 완료"만 표시.

15. **`withdrawMember()`가 신설 테이블을 스크럽하지 않음 (데이터 무결성 버그)**
    - 함수 주석은 Phase 3 시점("order/coupon/mileage/board 테이블 아직 없음")
      기준으로 작성돼 있으나, 지금은 OrderInfo/Coupon/Mileage/Inquiry/
      FavoriteGoods/FavoriteStore/BoardPost가 모두 존재. `withdrawMember`는
      여전히 `prisma.member.delete()`만 수행 — FK 제약이 없어 에러는 안 나지만,
      탈퇴 후 같은 아이디로 재가입하면 옛 탈퇴회원의 주문/쿠폰/마일리지/게시글이
      신규 가입자에게 그대로 귀속됨.

16. **회원가입 인라인 약관 placeholder 미치환**
    - `/agreement`·`/privacy`(전체 페이지)의 `{JOINFORM}` 등 치환은 이미
      문서화된 gap이나, **회원가입 폼 인라인 체크박스**(`RegistForm.tsx`의
      `config.agreementTerms`/`agreementPrivacy`)는 별도로 치환 없이
      `dangerouslySetInnerHTML`로 그대로 노출 — seed 데이터의 `{SYEAR}년
      {SMONTH}월 {SDAY}일`, `{COMPANY}`, `{JOINFORM}` 토큰이 화면에 그대로
      보임(확인됨).

17. **`regist_vendor_post.php` 서버측 필수값 검증 약화**
    - 레거시는 `id/passwd/comp_name/comp_license_no/comp_email/cont_name/
      cont_cell` 7개 필수. 신규 `registerVendor()`는 `id/password/compName/
      compOwner` 4개만 확인(`compOwner`는 레거시에 없던 필드). 나머지는 UI의
      `required` 속성에만 의존해 서버 우회 시 무력화됨. `VendorConfiguration`도
      가입 시점에 자동 생성 안 됨(레거시는 기본 배송비/공통 안내문구 즉시 복사) —
      `/vendor/store` 방문 전까지 `getVendorConfiguration`이 `null`.

18. **마이페이지 대시보드 위젯 전멸**
    - `mypage.php` — 주문상태별(9종) 건수 배지, 회원등급명, 마일리지, 쿠폰/
      관심상품/관심스토어/최근본상품/1:1문의/후기/상품문의 건수, 최근 1개월
      주문내역 인라인 목록(취소/배송조회/교환/반품/리뷰작성 버튼 포함) 전부 노출.
    - `app/mypage/page.tsx`(82줄)는 이름/아이디/이메일/마일리지 + 링크 목록뿐.
      그룹C가 하위 조회화면 3개를 "추가"했다고만 기록했지, 마이페이지 자체의
      대시보드/주문현황 요약이 사라진 사실은 문서에 없음.

19. **로그인 부가기능 소소한 회귀**: "아이디저장"(`s_id` 쿠키) 체크박스 없음,
    `id_check_json.php`(실시간 중복확인)에 대응하는 실시간 체크가 회원가입/
    입점신청 폼에 없어(제출 후에만 서버 확인) UX 회귀.

### G4. 마이페이지/리뷰/문의/CS

20. **`my_mileage.php` — 소멸(예정)일 정보 누락**: 레거시는 만료일/만료임박
    필터/총 적립·사용 요약을 제공하나 `getMileageHistory()`(mileage.ts:116-125)는
    `expired_date`/`expired_use`/`expired`를 select하지 않음 — Phase 9에서
    실제 만료 배치(`expireMileageLots`)를 도입했음에도 회원이 자기 마일리지
    소멸 시점을 확인할 방법이 없음.

21. **`my_coupon.php` — 할인한도/최소구매조건/적용상품 표시 누락**:
    `getMyCouponHistory()`(coupon.ts:116)는 `discountLimit`/`useLimit`/
    `goodsUid`를 반환하지만 페이지가 렌더링하지 않음.

22. **`my_favorite_store.php`/`store.php` — `basic_name`(스토어 표시명) 미구현**:
    레거시는 `vendor_configuration.basic_name`이 설정돼 있으면 이를 우선
    표시(`my_favorite_store.php:45`). 신규 `VendorConfigurationInput`
    (vendor.ts:282)에 이 필드 자체가 없어 벤더가 설정 불가, `getStoreInfo()`/
    `getMyFavoriteStores()` 둘 다 항상 `comp_name`만 사용. 컬럼은 스키마에
    있으나(schema.prisma:931) 읽기/쓰기 모두 미구현. `FSTORE_CNT`(찜한 회원 수)도
    목록에 없음.

23. **상품문의(`inquiry_post.php`/`popup_inquiry_write.php`/`view_inquiry.php`) —
    Phase 3의 "회원전용 단순화" 외 추가 차이**:
    - `Configuration.inquiry_privacy_type`(작성자명 마스킹) 미참조 —
      `InquiryPanel.tsx`가 이름을 그대로 노출.
    - `Configuration.inquiry_cate_info`(문의 분류) 미참조 — 분류 선택 없음.
    - 첨부파일(최대 5개, `mallRN_inquiry.files` 컬럼 존재) 업로드 완전 미구현.
    - `contact` 필드는 `CreateInquiryInput`에 optional로 있으나 폼에 입력창
      없음 — 항상 빈 값.
    - `Configuration.inquiry_secret_type`(강제/선택/비활성 3단계) 미참조 —
      항상 선택형 체크박스.

24. **`my_recent_goods.php` — 전용 목록 페이지 자체가 통째로 부재**:
    MIGRATION.md는 "최근본상품 드로어" 미구현만 언급하나, 레거시는 드로어와
    별개로 날짜별 그룹핑(요일 헤더)된 전용 목록 페이지였음(`my_favorite_goods.php`와
    거의 동일 구조, `mallRN_goods_recent_view`를 `cart_id`로 조회). 신규 저장소엔
    이 테이블 자체가 스키마에 없고 전용 페이지도 없음 — "드로어"뿐 아니라 "전용
    목록 페이지" 개념 자체가 누락됐다는 사실은 기존 문서에 없음.

25. (경미) `my_favorite_goods.php`의 날짜별 그룹핑(요일 표시)이 신규
    `GoodsGrid` 평면 그리드로 단순화 — 데이터 손실은 아니고 표시 방식 차이.

### G5. 네이버피드/async 배치

26. **`purgeOldLogs()`의 정리 대상 근거가 스테일해짐**: 레거시
    `async_day_proc.php`는 `keyword_recent`/`keyword_search` 외에도
    `goods_view`/`goods_recent_view`/`db_error_log`/`favorite_goods`/
    `admin_log`/`vendor_log`/`delivery_api_log`까지 정리하는데, 신규
    `scheduled-jobs.ts`의 `purgeOldLogs()`는 "이 저장소에 존재하는 3개 테이블
    (KeywordRecent/KeywordSearch/SmsLog)만"이라는 Phase 9 시점 주석을 그대로
    유지 — 이후 완결성 감사 그룹 D/E에서 신설된 `AccessLog`/`DbErrorLog`/
    `DeliveryApiLog`/`FavoriteGoods`는 어디서도 정리되지 않음(`store_display`
    사례와 동일한 "스코프컷 근거 스테일" 패턴).

27. **기획전 자동 상태전환이 `discount_yn` 조건을 무시**: 레거시는
    `discount_yn='Y'`(할인형)인 기획전만 날짜 기반 자동전환 대상으로 삼는데,
    신규 `updateExhibitionStatuses()`(scheduled-jobs.ts:62-73)는 이 조건 없이
    모든 status=1/2 기획전을 대상으로 함 — 순수 진열형 기획전도 실수로
    자동전환될 수 있음.

### G6. 게시판

28. **리치에디터/인라인 이미지 첨부 기능 전체 부재**: 레거시
    `board/sn_image_post_json.php`는 게시글 본문에 이미지를 인라인 삽입하는
    AJAX 엔드포인트(최대 20개)로, 본문 자체가 HTML 리치텍스트. 신규
    `BoardWriteForm.tsx`/`BoardPostForm.tsx`는 순수 `<textarea>`이고
    `BoardPostBody.tsx`는 평문(`whiteSpace:"pre-wrap"`)으로만 렌더링 — 대응
    코드/엔드포인트가 전혀 없음.

29. **비밀글 조회수 세션 중복방지 미구현 + 코드 주석 사실오류**: 레거시
    `view.php:209-230`은 세션(`$_SESSION['board_view']`)으로 재조회 시 조회수
    중복증가를 막는데, 신규 `board.ts`의 `getPostDetail`은 매 호출마다
    무조건 증가시키면서, 코드 주석은 "레거시도 조회자별 dedupe 없음"이라고
    **사실과 반대로** 적혀 있음.

30. **1:1문의(counsel) 커스텀필드 중 "주문번호" 누락**: 시드값상 counsel은
    "연락처"(필수)+"주문번호"(선택) 2개 커스텀 필드를 갖는데, 신규
    `BOARD_CONFIG.counsel`은 `hasContact`(연락처)만 있고 "주문번호" 필드가
    없음.

31. **"관련링크"(최대 5개 URL) 기능 전체 미이행**: notice/counsel이
    `links=1`로 최대 5개 URL 등록 지원(`write.php:121-134`)하는데, 신규
    `BoardPost` 관련 타입/폼/컬럼 어디에도 `links` 개념이 없음.

32. **이전글/다음글 네비게이션 미이행**: `view.php:274-330`에 대응하는 코드가
    `app/board/[boardId]/[uid]/page.tsx`에 없음.

33. **페이지당 게시물수(record_num)가 레거시 값과 다름**: 시드값은
    notice/faq/counsel=10, gallery=6인데, 신규는 `board.ts`의
    `LIST_LIMIT=15`로 4개 게시판 전부 통일.

34. **자동등록방지(스팸방지) 토큰 로직 미이행**: `board_post.php:113-138`의
    2초~30분 제출간격 강제 + 토큰 재사용 차단에 대응하는 검증이
    `createPostAction`/`createCommentAction`에 없음(서버 액션 구조상 위험도는
    상대적으로 낮음).

35. **첨부파일 확장자 정책이 화이트리스트로 축소**: 레거시는 블랙리스트
    방식(php/inc/htm/phtm/shtm/ztx/dot/cgi/pl/asp/jsp만 차단, zip/doc/xls/hwp/txt
    등 대부분 허용)인데, 신규 `board-upload.ts`는 jpg/jpeg/png/gif/webp/pdf만
    화이트리스트로 허용 — 보안 강화 방향의 의도적 재설계로 보이나
    MIGRATION.md에 명시되지 않음. 5MB/5개 캡은 정확히 일치.

---

## 2. 화면 단위 완전 일치 확인된 목록

- **G1**: main.php, list.php, search.php, best.php, new.php, store.php,
  store_cate.php, exhibition.php, exhibition_list.php (view.php의 옵션 렌더링,
  배송비 5분기 메시지, 품절판정, 찜하기, 판매자 인기상품, 상품문의,
  information_use 공통안내문구, 팝업 만료판정, 홈 화면 섹션 구성 포함)
- **G2**: favorite_goods_json.php, favorite_goods_del_json.php,
  favorite_store_json.php, favorite_store_del_json.php, goods_cart_json.php,
  goods_cart_option_json.php, goods_cart_post_json.php
- **G3**: passwd_check_json.php, popup_passwd.php, zip_search_json.php,
  agreement.php/privacy.php의 전체 페이지 치환, passwd_search_step_json.php
  3단계, passwd_search_post.php, logout.php
- **G4**: cs_center.php, add_page.php, my_counsel.php
- **G6**: BOARD_CONFIG의 secretType/categories/hasFiles/hasContact 전체,
  첨부 5MB/5개 캡, 비밀글 게이팅 분기 구조

## 3. 이미 알려진 gap과 일치 (재확인)

리뷰 기능 전체(mallRN_review 테이블 없음), 방문자/키워드 통계 인프라 부재,
검색 자동완성 단순화, 최근본상품 드로어/조회수 증가 미구현, 네이버페이 위시/
장바구니 API(naverGoodsCart/Info/Wish — naverGoodsXml은 상품피드와 무관한 별개
기능임을 이번에 코드로 재확인), async_patch.php(타사 상용 소프트웨어의
텔레메트리, 포팅대상 아님), FCM 푸시 스코프아웃, 판매사 전용 게시판
(vnotice/vcounsel) 미착수, 게시판 flat 댓글 단순화, 고객 게시글 수정/삭제
스코프컷, 상품문의 비회원 플로우 미구현, 벤더별 배송정책 차등 없음,
게스트 주문조회 단건화, 기타정책(etcs_info.php) 의도적 스코프컷 등.

## 4. 불확실한 것 / 추가 확인 필요

- 구매제한 버그(항목 1)가 의도된 설계인지 단순 실수인지는 코드 근거상
  "실수"로 보이나 원 작업자 의도를 확인할 방법이 없음.
- `sub_menu.php`의 cs_center 하위메뉴가 가리키는 review/inquiry 게시판은
  레거시 기본 설치(`mallRN_board_manager` 기본 6종: notice/faq/counsel/
  vnotice/vcounsel/gallery)에도 없어 원래도 죽은 링크였을 가능성 — 신규가 이
  링크를 만들지 않은 게 실제 gap인지 판단 보류.
- 게시판 검색 `field`(제목/내용/이름/아이디 선택)의 레거시 기본 스코프는
  공용 클래스(`class.ListPaging.php`, board/ 10개 파일 밖) 내부 로직이라
  완전히 추적하지 못함.
- automail 템플릿에 `join`/`vjoin`(가입 축하) 타입이 seed에 존재하는지
  전부 확인하지 못함.
- `vendor_id_check_json.php`의 실시간 중복확인이 백오피스 전용 입점사
  생성 플로우(관리자가 직접 만드는 경로)에 별도로 존재할 가능성은 배제
  못 함 — storefront `regist_vendor`만 확인.
- G5 항목의 `DeliveryApiLog`(3개월)/`AccessLog`(2년) 미정리가 "의도적
  영구보존"인지 "단순 누락"인지는 문서에 의도 표시가 없어 확인 불가.
- G1의 "쿠폰적용가 목록 노출" 관련 스코프컷이 기존 "쿠폰발급은 다운로드만"
  문서와 완전히 겹치는 서술인지, 별도 항목인지 확정하지 못함.

---

*이 문서는 2026-08-08 재검증 조사 결과이며, 코드 수정은 수행하지 않았다.
각 항목의 처리 여부(구현/스코프컷 결정)는 `MIGRATION.md`의 다음 갱신 시
반영 여부를 별도로 결정할 것.*
