-- Coupon and mileage ledger tables for Phase 4 (cart/order engine).
-- Source of truth: shoppingmall_php/install/install_post.php
-- (mallRN_coupon 712-722, mallRN_coupon_manager 731-747,
-- mallRN_mileage 1335-1351).
--
-- mallRN_mileage is not listed in MIGRATION.md's original Phase 4 table
-- list but is required — it's the append-only earn/spend ledger backing
-- lib.Shop.php's mileageChange/useMileageChange/saveMileageChange; without
-- it Member.mileage has nothing to source its cached balance from.
--
-- Intentionally NOT added: mallRN_mileage_log (legacy defines it but no
-- PHP file reads from it — looks like a dead admin-audit table).

CREATE TABLE `mallRN_coupon` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `c_uid` int unsigned NOT NULL default '0' COMMENT '쿠폰 고유값',
  `g_uid` int unsigned NOT NULL default '0' COMMENT '상품 고유값',
  `id` varchar(50) NOT NULL default '' COMMENT '아이디',
  `status` tinyint unsigned NOT NULL default '0' COMMENT '쿠폰상태 0(발급완료), 1(사용완료), 2(기간만료)',
  `e_date` datetime default '1000-01-01 00:00:00' COMMENT '사용기간 종료시간',
  `usedate` int unsigned NOT NULL default '0' COMMENT '사용일시',
  `signdate` int unsigned NOT NULL default '0' COMMENT '등록일시',
  PRIMARY KEY (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='쿠폰발급정보';

CREATE TABLE `mallRN_coupon_manager` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `name` varchar(100) NOT NULL default '' COMMENT '쿠폰명',
  `type` int unsigned NOT NULL default '0' COMMENT '발급방식 0(관리자 수동발급), 1(회원가입시 자동발급), 2(첫주문시 자동발급), 3(생일쿠폰 자동발급), 4(상품상세페이지 다운로드)',
  `discount` int unsigned NOT NULL default '0' COMMENT '할인금액(률)',
  `discount_type` enum('P', 'W') NOT NULL default 'P' COMMENT '할인방식 P(%), W(원)',
  `discount_limit` int unsigned NOT NULL default '0' COMMENT '할인방식 %일 경우 최대할인금액',
  `use_type` int unsigned NOT NULL default '0' COMMENT '사용방식 0(특정기간), 1(발급후기간)',
  `use_s_date` datetime default '1000-01-01 00:00:00' COMMENT '사용기간 시작시간',
  `use_e_date` datetime default '1000-01-01 00:00:00' COMMENT '사용기간 종료시간',
  `use_day` int unsigned NOT NULL default '0' COMMENT '발급 후 사용기간',
  `use_limit` int unsigned NOT NULL default '0' COMMENT '사용가능 최소 상품금액',
  `use_limit2` int unsigned NOT NULL default '0' COMMENT '상품당 중복사용 가능 횟수 (미사용)',
  `goods_order` text NOT NULL COMMENT '쿠폰적용상품 (상품고유번호,상품고유번호,상품고유번호...)',
  `signdate` int unsigned NOT NULL default '0' COMMENT '등록일시',
  PRIMARY KEY (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='쿠폰정보';

CREATE TABLE `mallRN_mileage` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `id` varchar(50) NOT NULL default '' COMMENT '아이디',
  `content` varchar(100) NOT NULL default '' COMMENT '내용',
  `mileage` int unsigned NOT NULL default 0 COMMENT '적립마일리지',
  `use_mileage` int unsigned NOT NULL default 0 COMMENT '사용마일리지',
  `proc_mileage` int unsigned NOT NULL default 0 COMMENT '유효기간 사용시 사용한 마일리지',
  `expired_use` tinyint NOT NULL default '0' COMMENT '유효기간 사용여부 0(사용안함), 1(사용함)',
  `expired` tinyint NOT NULL default '0' COMMENT '유효기간 만료여부 0(만료안됨), 1(만료됨)',
  `expired_date` date NOT NULL default '1000-01-01' COMMENT '유효기간 만료일',
  `order_num` varchar(50) NOT NULL default '' COMMENT '구매 주문번호',
  `goods_uid` varchar(50) NOT NULL default '' COMMENT '구매 상품고유값',
  `proc_id` varchar(50) NOT NULL default '' COMMENT '수동 등록시 처리자 아이디',
  `proc_acc_ip` varchar(50) NOT NULL default '' COMMENT '수동 등록시 접속 아이피',
  `signdate` int unsigned NOT NULL default 0 COMMENT '등록일',
  PRIMARY KEY (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='마일리지정보';
