-- Phase 8 (입점사 백엔드). mallRN_vendor_configuration is a literal copy of
-- legacy DDL (install/install_post.php:2055-2092) — a real per-vendor
-- settings table, not dynamically created. This repo's write scope only
-- exposes a subset of its columns (CS times, return address, delivery/
-- refund/exchange/as info text) — see packages/core/src/vendor.ts; the rest
-- (design_main_* display customization) stays unused, same principle as
-- Configuration's many admin-only columns already in this schema.
--
-- mallRN_order_sales / mallRN_sales_calculate are NOT literal copies —
-- legacy's mallRN_order_sales is a 23-column general-purpose sales ledger
-- shared by multiple reporting screens, and mallRN_sales_calculate has an
-- implicit state machine (tax_bill/status manual toggles) this migration's
-- Phase 8 scope explicitly excludes. Both are hand-redesigned down to just
-- what settlement needs — same kind of simplification as the board tables
-- (Phase 6) and category codes (Phase 7). Table names are kept so a future
-- phase could still extend them under the same identity if fuller admin
-- reporting is ever needed.

CREATE TABLE `mallRN_vendor_configuration` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `vendor` varchar(50) NOT NULL default '' COMMENT '입점사 아이디',
  `basic_name` varchar(100) NOT NULL default '' COMMENT '스토어명',
  `basic_cs_time1` varchar(50) NOT NULL default '' COMMENT '평일 운영시간',
  `basic_cs_time2` varchar(50) NOT NULL default '' COMMENT '토요일 운영시간',
  `basic_cs_time3` varchar(50) NOT NULL default '' COMMENT '일요일/공휴일 운영시간',
  `basic_cs_time4` varchar(50) NOT NULL default '' COMMENT '점심시간',
  `comp_rtn_postcode` varchar(10) NOT NULL default '' COMMENT '반품지 우편번호',
  `comp_rtn_address1` varchar(100) NOT NULL default '' COMMENT '반품지 주소',
  `comp_rtn_address2` varchar(100) NOT NULL default '' COMMENT '반품지 상세주소',
  `delivery_type` enum('F','D','P') NOT NULL default 'P' COMMENT '배송비 정책',
  `delivery_d_price` int unsigned NOT NULL default '0' COMMENT '착불 기본 배송비',
  `delivery_p_type` varchar(20) NOT NULL default 'order' COMMENT '조건부 배송비 기준',
  `delivery_p_price1` int unsigned NOT NULL default '0' COMMENT '무료배송 기준금액',
  `delivery_p_price2` int unsigned NOT NULL default '0' COMMENT '기준금액 미만 배송비',
  `delivery_info` text NOT NULL COMMENT '배송안내',
  `goods_option_info` text NOT NULL,
  `goods_brand_info` text NOT NULL,
  `goods_make_info` text NOT NULL,
  `goods_origin_info` text NOT NULL,
  `goods_delivery_info` text NOT NULL COMMENT '상품별 배송안내 기본값',
  `goods_refund_info` text NOT NULL COMMENT '환불안내',
  `goods_exchange_info` text NOT NULL COMMENT '교환안내',
  `goods_as_info` text NOT NULL COMMENT 'A/S안내',
  `design_main_display1` tinyint unsigned NOT NULL default '0',
  `design_main_display2` tinyint unsigned NOT NULL default '0',
  `design_main_display3` tinyint unsigned NOT NULL default '0',
  `design_main_custom_code` tinyint unsigned NOT NULL default '0',
  `design_main_custom_code_image` text NOT NULL,
  `design_main_custom_code_info` text NOT NULL,
  `design_main_display_order` text NOT NULL,
  `push_yn` enum('Y','N') NOT NULL default 'N',
  `token_pc` varchar(250) NOT NULL default '',
  `token_mobile` varchar(250) NOT NULL default '',
  `widget_info` text NOT NULL,
  PRIMARY KEY (`uid`),
  KEY `vendor` (`vendor`)
) DEFAULT CHARSET=utf8 COMMENT='입점사별 스토어 설정';

CREATE TABLE `mallRN_order_sales` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `order_num` varchar(32) NOT NULL default '' COMMENT '주문번호',
  `og_uid` int unsigned NOT NULL default '0' COMMENT '주문상품 고유값',
  `vendor` varchar(50) NOT NULL default '' COMMENT '입점사 아이디',
  `g_name` varchar(100) NOT NULL default '' COMMENT '상품명 스냅샷',
  `price` int unsigned NOT NULL default '0' COMMENT '판매단가 스냅샷',
  `qty` int unsigned NOT NULL default '0',
  `commission_pct` float NOT NULL default '0' COMMENT '수수료율(%) 스냅샷',
  `commission_amount` int NOT NULL default '0' COMMENT '수수료 금액 = price*qty*commission_pct/100',
  `confirmed` tinyint unsigned NOT NULL default '0' COMMENT '구매확정 여부(orderStatus5 시점)',
  `confirm_date` int unsigned NOT NULL default '0',
  `settled` tinyint unsigned NOT NULL default '0' COMMENT '정산 확정 배치에 포함됐는지',
  `signdate` int unsigned NOT NULL default '0',
  PRIMARY KEY (`uid`),
  KEY `vendor` (`vendor`),
  KEY `order_num` (`order_num`)
) DEFAULT CHARSET=utf8 COMMENT='입점사 정산 대상 라인 기록';

CREATE TABLE `mallRN_sales_calculate` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `vendor` varchar(50) NOT NULL default '' COMMENT '입점사 아이디',
  `vendor_name` varchar(100) NOT NULL default '' COMMENT '입점사명 스냅샷',
  `date_from` varchar(20) NOT NULL default '',
  `date_to` varchar(20) NOT NULL default '',
  `goods_total` int NOT NULL default '0' COMMENT '상품매출 합계',
  `commission_total` int NOT NULL default '0' COMMENT '수수료 합계',
  `payout_total` int NOT NULL default '0' COMMENT '지급액 = goods_total - commission_total',
  `bank_name` varchar(20) NOT NULL default '' COMMENT '지급계좌 스냅샷',
  `bank_num` varchar(20) NOT NULL default '',
  `bank_owner` varchar(20) NOT NULL default '',
  `signdate` int unsigned NOT NULL default '0',
  PRIMARY KEY (`uid`),
  KEY `vendor` (`vendor`)
) DEFAULT CHARSET=utf8 COMMENT='입점사 정산 확정 배치 기록';
