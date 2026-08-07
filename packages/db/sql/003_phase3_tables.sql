-- Phase 3 addition: member auth. mallRN_member_sleep (dormant-account
-- reactivation, populated by a scheduled job — async_day_proc.php) is
-- skipped; nothing moves members into it yet since that job is Phase 9
-- (async/cron) territory. Source of truth:
-- shoppingmall_php/install/install_post.php:1162-1244, 542-550.

CREATE TABLE `mallRN_member` (
	`uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
	`id` varchar(50) NOT NULL default '' COMMENT '아이디',
	`name` varchar(50) NOT NULL default '' COMMENT '이름',
	`passwd` varchar(100) NOT NULL default '' COMMENT '비밀번호',
	`tel` varchar(30) NOT NULL default '' COMMENT '전화번호',
	`cell` varchar(30) NOT NULL default '' COMMENT '핸드폰번호',
	`postcode` varchar(10) NOT NULL default '' COMMENT '우편번호',
	`address1` varchar(100) NOT NULL default '' COMMENT '주소',
	`address2` varchar(100) NOT NULL default '' COMMENT '상세주소',
	`email` varchar(80) NOT NULL default '' COMMENT '이메일',
	`birth` varchar(30) NOT NULL default '' COMMENT '생년월일',
	`birth_sl` enum ('S','L','N') NOT NULL default 'N' COMMENT '생년월일 S(양력), L(음력), N(미선택)',
	`gender` enum('M','F','N') NOT NULL default 'N' COMMENT '성별 M(남성), F(여성), N(미선택)',
	`marry` enum('M','S','N') NOT NULL default 'N' COMMENT '결혼여부 M(기혼), S(미혼), N(미선택)',
	`hobby` varchar(50) NOT NULL default '' COMMENT '관심분야',
	`job` varchar(250) NOT NULL default '' COMMENT '직업',
	`level` tinyint unsigned NOT NULL default 1 COMMENT '등급 1 ~ 9, 10(관리자)',
	`mileage` int NOT NULL default 0 COMMENT '마일리지',
	`mailling` enum('Y','N') NOT NULL default 'N' COMMENT '메일링 Y(수신허용), N(수신안함)',
	`mailling_date` int unsigned NOT NULL default 0 COMMENT '메일링수신여부 변경일',
	`sms` enum('Y','N') NOT NULL default 'N' COMMENT 'SMS Y(수신허용), N(수신안함)',
	`sms_date` int unsigned NOT NULL default 0 COMMENT 'SMS수신여부 변경일',
	`comp` varchar(50) NOT NULL default '' COMMENT '회사명',
	`comp_owner` varchar(50) NOT NULL default '' COMMENT '대표자명',
	`comp_num` varchar(50) NOT NULL default '' COMMENT '사업자등록번호',
	`comp_postcode` varchar(10) NOT NULL default '' COMMENT '회사소재지 우편번호',
	`comp_address1` varchar(100) NOT NULL default '' COMMENT '회사소재지',
	`comp_address2` varchar(100) NOT NULL default '' COMMENT '회사소재지 상세주소',
	`comp_type` varchar(100) NOT NULL default '' COMMENT '업종',
	`comp_item` varchar(100) NOT NULL default '' COMMENT '업태',
	`add1` text NOT NULL COMMENT '추가필드1',
	`add2` text NOT NULL COMMENT '추가필드2',
	`add3` text NOT NULL COMMENT '추가필드3',
	`add4` text NOT NULL COMMENT '추가필드4',
	`add5` text NOT NULL COMMENT '추가필드5',
	`memo` text NOT NULL COMMENT '회원메모',
	`sns_type` varchar(50) NOT NULL default '' COMMENT 'SNS명(naver, kakao, google, payco)',
	`sns_id` varchar(50) NOT NULL default '' COMMENT 'SNS회원아이디',
	`sns_name` varchar(50) NOT NULL default '' COMMENT 'SNS회원명',
	`dup_info` varchar(100) NOT NULL default '' COMMENT '본인인증중복방지값',
	`cnts` int unsigned NOT NULL default 0 COMMENT '방문수',
	`fail_cnts` int unsigned NOT NULL default 0 COMMENT '로그인 연속실패수',
	`fail_time` int unsigned NOT NULL default 0 COMMENT '로그인 실패시간',
	`mobile` enum('Y','N') NOT NULL default 'N' COMMENT '모바일가입 Y(모바일), N(PC)',
	`auth` enum('Y','N') NOT NULL default 'Y' COMMENT '가입승인 Y(승인완료), N(미승인)',
	`reference` varchar(50) NOT NULL default '' COMMENT '추천인',
	`auth_code` varchar(10) NOT NULL default '' COMMENT '인증코드',
	`auth_code_time` int unsigned NOT NULL default 0 COMMENT '인증코드 발급시간',
	`login_time` int unsigned NOT NULL default 0 COMMENT '최종 로그인 시간',
	`order_time` int unsigned NOT NULL default 0 COMMENT '최종 주문 시간',
	`sleep_time` int unsigned NOT NULL default 0 COMMENT '휴먼회원해제일',
	`signdate` int unsigned NOT NULL default 0 COMMENT '가입일',
  PRIMARY KEY  (`uid`),
  UNIQUE KEY (`id`),
  KEY name (`name`)
) DEFAULT CHARSET=utf8 COMMENT='회원정보';

CREATE TABLE `mallRN_member_level` (
	`uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
	`level` int unsigned NOT NULL default '0' COMMENT '회원레벨',
	`name` varchar(250) NOT NULL default '' COMMENT '회원등급명',
	`discount` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '제공할인률',
	`mileage` int unsigned NOT NULL default '0' COMMENT '추가마일리지률',
	`delivery_free` tinyint unsigned NOT NULL default '0' COMMENT '배송비무료 0(무료미적용), 1(무료적용)',
	`price` int unsigned NOT NULL default '0' COMMENT '등급평가 주문금액',
	`coupon_uid` int unsigned NOT NULL default '0' COMMENT '등급평가 발급쿠폰 고유번호',
	`signdate` int unsigned NOT NULL default 0 COMMENT '등록일',
  PRIMARY KEY  (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='회원 등급 설정 정보';

CREATE TABLE `mallRN_configuration_social` (
	`uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
	`site` varchar(50) NOT NULL default '' COMMENT '사이트명',
	`used` tinyint unsigned NOT NULL default '0' COMMENT '사용여부 0(사용안함), 1(사용함)',
	`api_id` varchar(100) NOT NULL default '' COMMENT 'Client ID',
	`api_key` varchar(100) NOT NULL default '' COMMENT 'Client Secret',
	 PRIMARY KEY (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='쇼셜 로그인 정보';
