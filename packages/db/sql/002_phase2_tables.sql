-- Phase 2 addition: mallRN_vendor, needed for the public vendor storefront
-- page (php/store.php). mallRN_vendor_configuration (per-vendor site
-- settings/display-order overrides) is skipped for now — the store page
-- falls back to shop-wide defaults the same way legacy does when a vendor
-- hasn't configured their own settings, and the vendor admin backend that
-- would ever populate that table is Phase 8 scope.
-- Source of truth: shoppingmall_php/install/install_post.php:2009-2046.

CREATE TABLE mallRN_vendor (
  `uid` int unsigned NOT NULL auto_increment COMMENT '고유값',
  `auth` enum('R','Y','N') NOT NULL default 'R' COMMENT '승인상태 R(승인요청), Y(승인완료), N(승인보류)',
  `sell` enum('A','R','N') NOT NULL default 'R' COMMENT '판매상태 A(판매허용), R(판매준비), N(판매중지)',
  `delivery_type` tinyint unsigned NOT NULL default '0' COMMENT '배송주체 0(판매자배송), 1(본사배송)',
  `id` varchar(50) NOT NULL default '' COMMENT '판매자 아이디',
  `passwd` varchar(50) NOT NULL default '' COMMENT '판매자 비밀번호(MD5)',
  `comp_name` varchar(100) NOT NULL default '' COMMENT '업체명',
  `comp_owner` varchar(20) NOT NULL default '' COMMENT '대표자명',
  `comp_license_no` varchar(50) NOT NULL default '' COMMENT '사업자등록번호',
  `comp_postcode` varchar(10) NOT NULL default '' COMMENT '사업장 주소 우편번호',
  `comp_address1` varchar(100) NOT NULL default '' COMMENT '사업장 주소',
  `comp_address2` varchar(100) NOT NULL default '' COMMENT '사업장 상세주소',
  `comp_type` varchar(100) NOT NULL default '' COMMENT '사업자 업태',
  `comp_item` varchar(100) NOT NULL default '' COMMENT '사업자 종목',
  `comp_email` varchar(100) NOT NULL default '' COMMENT '대표이메일',
  `comp_tel` varchar(20) NOT NULL default '' COMMENT '대표번호',
  `comp_fax` varchar(20) NOT NULL default '' COMMENT '대표팩스번호',
  `cont_name` varchar(100) NOT NULL default '' COMMENT '담당자명',
  `cont_cell` varchar(20) NOT NULL default '' COMMENT '담당자 연락처',
  `cont_email` varchar(50) NOT NULL default '' COMMENT '담당자 이메일',
  `cont_part` varchar(50) NOT NULL default '' COMMENT '담당자 부서',
  `cont_position` varchar(50) NOT NULL default '' COMMENT '담당자 직위',
  `goods_auth` enum('A','P') NOT NULL default 'A' COMMENT '상품승인 A(자동승인), P(관리자 수동승인)',
  `commission` float(4,2) NOT NULL default '0.00' COMMENT '판매 수수료',
  `bank_name` varchar(20) NOT NULL default '' COMMENT '정산계좌정보 은행명',
  `bank_num` varchar(20) NOT NULL default '' COMMENT '정산계좌정보 계좌정보',
  `bank_owner` varchar(20) NOT NULL default '' COMMENT '정산계좌정보 예금주',
  `account_cycle` int unsigned NOT NULL default '1' COMMENT '정산주기 월 1회 ~ 4회',
  `memo` text NOT NULL COMMENT '관리메모',
  `image1` varchar(100) NOT NULL default '' COMMENT '사업자등록증사본',
  `image2` varchar(100) NOT NULL default '' COMMENT '통장사본',
  `fail_cnts` int unsigned NOT NULL default 0 COMMENT '로그인 연속실패수',
  `fail_time` int unsigned NOT NULL default 0 COMMENT '로그인 실패시간',
  `login_time` int unsigned NOT NULL default 0 COMMENT '최종 로그인 시간',
  `signdate` int unsigned NOT NULL default '0' COMMENT '등록일',
  PRIMARY KEY (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='판매사 정보';
