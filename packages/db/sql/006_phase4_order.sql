-- Order tables for Phase 4 (cart/order engine). Source of truth:
-- shoppingmall_php/install/install_post.php (mallRN_order_delivery
-- 1500-1509, mallRN_order_goods 1518-1547, mallRN_order_info 1556-1598,
-- mallRN_order_log 1607-1618).
--
-- Intentionally NOT added here (see MIGRATION.md Phase 4 scope decisions):
-- mallRN_order_sales (admin revenue-ledger/reporting only, no admin screen
-- exists yet), mallRN_order_status_change (exchange/return/cancel request
-- queue for admin approval — this repo's cancel flow calls orderStatus9/95
-- directly instead), mallRN_order_related_goods (co-purchase log — Phase 2
-- already implements a "함께보면 좋은상품" widget a different way).
--
-- mallRN_order_delivery.adds (extra regional delivery fee) is kept in the
-- schema for legacy column parity but always written as 0 — this repo has
-- no mallRN_vendor_configuration/mallRN_delivery_configuration tables to
-- source per-vendor/per-region delivery policy from.

CREATE TABLE `mallRN_order_delivery` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `order_num` varchar(32) NOT NULL default '' COMMENT '주문번호',
  `vendor` varchar(50) NOT NULL default '' COMMENT '판매사 아이디',
  `price` int unsigned NOT NULL default '0' COMMENT '배송비',
  `adds` int unsigned NOT NULL default '0' COMMENT '추가배송비',
  `info` varchar(100) NOT NULL default '' COMMENT '배송정책 (배송비적용방식|조건부배송비1|조건부배송비2)',
  `signdate` int unsigned NOT NULL default '0' COMMENT '등록일시',
  PRIMARY KEY (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='주문배송정보';

CREATE TABLE `mallRN_order_goods` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `vendor` varchar(50) NOT NULL default '' COMMENT '판매사 아이디',
  `vendor_delivery` varchar(50) NOT NULL default '' COMMENT '배송 판매사 아이디',
  `commission` float(5,2) unsigned NOT NULL default '0.00' COMMENT '커미션',
  `order_num` varchar(32) NOT NULL default '' COMMENT '주문번호',
  `g_uid` int unsigned NOT NULL default '0' COMMENT '상품 고유값',
  `g_cate` bigint unsigned NOT NULL default '0' COMMENT '상품분류번호',
  `g_name` varchar(100) NOT NULL default '' COMMENT '상품명',
  `g_code` varchar(50) NOT NULL default '' COMMENT '자체상품코드',
  `price` int unsigned NOT NULL default '0' COMMENT '판매가(옵션가, 쿠폰, 할인 포함)',
  `orig_price` int unsigned NOT NULL default '0' COMMENT '매입가(공급가)(옵션가 포함)',
  `qty` int unsigned NOT NULL default '0' COMMENT '구매수량',
  `mileage` int unsigned NOT NULL default '0' COMMENT '마일리지 적립금액',
  `option` int unsigned NOT NULL default '0' COMMENT '옵션고유값',
  `option_name` varchar(100) NOT NULL default '' COMMENT '옵션명',
  `delivery_type` int unsigned NOT NULL default '0' COMMENT '배송비 설정 1(환경설정 사용), 2(무료배송), 3(착불), 4(별도책정(고정)), 5(별도책정(개당))',
  `delivery_price` int unsigned NOT NULL default '0' COMMENT '별도책정시 배송비',
  `delivery_info` varchar(100) NOT NULL default '' COMMENT '배송정보 (배송업체번호|송장번호)',
  `use_coupon` int unsigned NOT NULL default '0' COMMENT '상품쿠폰 할인금액',
  `coupon_uid` int unsigned NOT NULL default '0' COMMENT '상품쿠폰 고유번호',
  `discount` int unsigned NOT NULL default '0' COMMENT '이벤트/회원 할인금액',
  `discount_info` varchar(50) NOT NULL default '' COMMENT '할인정보 예) 회원등급할인 : 10%, 이벤트할인 : 5%',
  `status` tinyint unsigned NOT NULL default '0' COMMENT '주문상태 0(입금대기중), 1(결제완료), 2(배송준비중), 3(배송중), 4(배송완료), 7(교환), 8(반품), 9(취소)',
  `status2` tinyint unsigned NOT NULL default '0' COMMENT '교환/반품/취소 처리상태 0(), 1(요청), 2(반품중, 교환중), 3(반품회수완료, 교환회수완료), 4(교환발송완료), 5(처리완료)',
  `status_date` int unsigned NOT NULL default '0' COMMENT '상태처리일시',
  `reals` tinyint unsigned NOT NULL default '0' COMMENT '실주문 0(주문미완료), 1(실주문)',
  `signdate` int unsigned NOT NULL default '0' COMMENT '주문일시',
  PRIMARY KEY (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='주문상품정보';

CREATE TABLE `mallRN_order_info` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `id` varchar(50) NOT NULL default '' COMMENT '아이디',
  `order_num` varchar(32) NOT NULL default '' COMMENT '주문번호',
  `name` varchar(50) NOT NULL default '' COMMENT '주문자명',
  `cell` varchar(30) NOT NULL default '' COMMENT '주문자 핸드폰번호',
  `email` varchar(80) NOT NULL default '' COMMENT '주문자 이메일',
  `name2` varchar(50) NOT NULL default '' COMMENT '수취인명',
  `cell2` varchar(30) NOT NULL default '' COMMENT '수취인 핸드폰번호',
  `postcode` varchar(10) NOT NULL default '' COMMENT '우편번호',
  `address1` varchar(100) NOT NULL default '' COMMENT '주소',
  `address2` varchar(100) NOT NULL default '' COMMENT '상세주소',
  `message` text COMMENT '요청사항',
  `memo` text NOT NULL COMMENT '메모',
  `passwd` varchar(100) NOT NULL default '' COMMENT '비밀번호(argon2id) — 게스트 주문조회용. 레거시는 MD5, 신규설치라 argon2id로 강화',
  `pay_total` int unsigned NOT NULL default '0' COMMENT '결제금액',
  `cancel_total` int unsigned NOT NULL default '0' COMMENT '취소금액',
  `refund_total` int unsigned NOT NULL default '0' COMMENT '환불금액',
  `delivery_total` int unsigned NOT NULL default '0' COMMENT '배송비총액',
  `pay_type` enum('B', 'C', 'R', 'V', 'H', 'M') NOT NULL default 'B' COMMENT '결제수단 B(무통장), C(카드), R(실시간계좌이체), V(가상계좌이체), H(핸드폰), M(마일리지결제)',
  `pay_status` enum('A', 'B', 'C', 'D') NOT NULL default 'A' COMMENT '결제상태 A(진행중), B(가상계좌발급완료), C(결제성공), D(결제실패)',
  `pay_info` varchar(255) NOT NULL default '' COMMENT '결제정보',
  `pay_number` varchar(100) NOT NULL default '' COMMENT '거래고유번호',
  `escrow` tinyint unsigned NOT NULL default '0' COMMENT '에스크로 0(미적용), 1(적용)',
  `bank_info` varchar(250) NOT NULL default '' COMMENT '무통장 입금정보 (입금계좌정보|입금자명)',
  `use_mileage` int unsigned NOT NULL default '0' COMMENT '마일리지 사용금액',
  `use_coupon` int unsigned NOT NULL default '0' COMMENT '장바구니쿠폰 할인금액',
  `coupon_uid` int unsigned NOT NULL default '0' COMMENT '장바구니쿠폰 고유번호',
  `cash_receipts` varchar(250) NOT NULL default '' COMMENT '현금영수증발행정보 (현금영수증발행용도|신분확인번호 (핸드폰번호, 사업자등록번호))',
  `mail_send` tinyint unsigned NOT NULL default '0' COMMENT '주문메일발송상태 0(미발송), 1(발송)',
  `cash_issued` tinyint unsigned NOT NULL default '0' COMMENT '현금영수증발급상태 0(미발급), 1(발급)',
  `tax_issued` tinyint unsigned NOT NULL default '0' COMMENT '세금계산서발급상태 0(미발급), 1(발급)',
  `mobile` enum('Y','N') NOT NULL default 'N' COMMENT '모바일 Y(모바일), N(PC)',
  `direct` tinyint unsigned DEFAULT '0' NOT NULL COMMENT '바로구매 여부 0(일반구매), 1(바로구매)',
  `new` tinyint unsigned DEFAULT '0' NOT NULL COMMENT '신규주문 여부 0(재주문), 1(신규주문)',
  `sales_issued` tinyint unsigned NOT NULL default '0' COMMENT '매출처리 0(미처리), 1(처리)',
  `mail_ok` tinyint unsigned NOT NULL default '0' COMMENT '메일발송 0(미발송), 1(발송)',
  `reals` tinyint unsigned NOT NULL default '0' COMMENT '실주문 0(주문미완료), 1(실주문)',
  `status_date` int unsigned NOT NULL default '0' COMMENT '결제일시',
  `signdate` int unsigned NOT NULL default '0' COMMENT '주문일시',
  PRIMARY KEY (`uid`),
  UNIQUE KEY (`order_num`)
) DEFAULT CHARSET=utf8 COMMENT='주문정보';

CREATE TABLE `mallRN_order_log` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `order_num` varchar(32) NOT NULL default '' COMMENT '주문번호',
  `og_uid` int unsigned NOT NULL default '0' COMMENT '주문상품고유값',
  `id` varchar(50) NOT NULL default '' COMMENT '아이디',
  `prev_status` tinyint unsigned NOT NULL default '0' COMMENT '주문상태 0(입금대기중), 1(결제완료), 2(배송준비중), 3(배송중), 4(배송완료), 7(교환), 8(반품), 9(취소)',
  `prev_status2` tinyint unsigned NOT NULL default '0' COMMENT '교환/반품/취소 처리상태 0(), 1(요청), 2(반품중, 교환중), 3(반품회수완료, 교환회수완료), 4(교환발송완료), 5(처리완료)',
  `status` tinyint unsigned NOT NULL default '0' COMMENT '주문상태 0(입금대기중), 1(결제완료), 2(배송준비중), 3(배송중), 4(배송완료), 7(교환), 8(반품), 9(취소)',
  `status2` tinyint unsigned NOT NULL default '0' COMMENT '교환/반품/취소 처리상태 0(), 1(요청), 2(반품중, 교환중), 3(반품회수완료, 교환회수완료), 4(교환발송완료), 5(처리완료)',
  `signdate` int unsigned NOT NULL default '0' COMMENT '처리일시',
  PRIMARY KEY (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='주문처리로그';
