-- Completeness audit — log/audit tables that were never ported. See
-- MIGRATION.md's "마이그레이션 완결성 감사" section for the full list.

-- mallRN_admin_log + mallRN_vendor_log had 100%-identical columns in
-- legacy, so this repo merges them into one table with an actor_type
-- discriminator (same redesign precedent as BoardPost's board-instance
-- merge) instead of porting two near-duplicate tables.
CREATE TABLE `mallRN_access_log` (
	`uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
	`actor_type` enum('ADMIN','VENDOR') NOT NULL DEFAULT 'ADMIN' COMMENT '주체 구분',
	`actor_id` varchar(50) NOT NULL default '' COMMENT '아이디',
	`content` varchar(250) NOT NULL default '' COMMENT '내용',
	`type` tinyint unsigned NOT NULL default 0 COMMENT '0(로그인),1(로그아웃)',
	`acc_ip` varchar(50) NOT NULL default '' COMMENT '접속 아이피',
	`signdate` int unsigned NOT NULL default 0 COMMENT '등록일',
	PRIMARY KEY (`uid`),
	KEY actor_id (`actor_id`)
) DEFAULT CHARSET=utf8 COMMENT='관리자/입점사 접속 로그';

-- Legacy mallRN_mileage_log is a delete-snapshot + manual-recovery table.
-- This repo uses soft-delete columns on Mileage itself instead — see
-- scheduled-jobs.ts's expireMileageLots comment for the same "ledger, don't
-- snapshot-and-restore" principle already established there.
ALTER TABLE `mallRN_mileage`
	ADD COLUMN `deleted` tinyint unsigned NOT NULL default 0 COMMENT '삭제여부(복구가능)' AFTER `signdate`,
	ADD COLUMN `deleted_proc_id` varchar(50) NOT NULL default '' COMMENT '삭제 처리자' AFTER `deleted`,
	ADD COLUMN `deleted_proc_ip` varchar(50) NOT NULL default '' COMMENT '삭제 처리자 IP' AFTER `deleted_proc_id`,
	ADD COLUMN `deleted_date` int unsigned NOT NULL default 0 COMMENT '삭제일' AFTER `deleted_proc_ip`;

-- Literal port of install_post.php's mallRN_order_cancel_cp_log (PG
-- cancel-callback audit trail) and mallRN_delivery_api_log (Sweet Tracker
-- poll log, wired into delivery-tracker.ts's pollDeliveryTracking).
CREATE TABLE `mallRN_order_cancel_cp_log` (
	`uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
	`order_num` varchar(32) NOT NULL default '' COMMENT '주문번호',
	`og_uid` int unsigned NOT NULL default 0 COMMENT '주문상품고유값',
	`price` int NOT NULL default 0 COMMENT '취소금액',
	`rem_price` int NOT NULL default 0 COMMENT '잔여금액',
	`pay_type` enum('B','C','R','V','H','M') NOT NULL default 'B' COMMENT '결제수단',
	`pay_number` varchar(50) NOT NULL default '' COMMENT 'PG 거래번호',
	`status` tinyint unsigned NOT NULL default 0 COMMENT '0(정상),1(연동오류)',
	`message` varchar(250) NOT NULL default '' COMMENT '메시지',
	`proc` tinyint unsigned NOT NULL default 0 COMMENT '수동처리여부',
	`signdate` int unsigned NOT NULL default 0 COMMENT '등록일',
	PRIMARY KEY (`uid`),
	KEY order_num (`order_num`)
) DEFAULT CHARSET=utf8 COMMENT='PG 취소 연동 로그';

CREATE TABLE `mallRN_delivery_api_log` (
	`uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
	`order_num` varchar(32) NOT NULL default '' COMMENT '주문번호',
	`og_uid` int unsigned NOT NULL default 0 COMMENT '주문상품고유값',
	`delivery_name` varchar(50) NOT NULL default '' COMMENT '택배사',
	`delivery_num` varchar(50) NOT NULL default '' COMMENT '송장번호',
	`delivery_code` varchar(20) NOT NULL default '' COMMENT '택배사코드',
	`status` tinyint unsigned NOT NULL default 0 COMMENT '0(상태변동없음),1(배송완료처리),2(연동오류)',
	`message` varchar(250) NOT NULL default '' COMMENT '메시지',
	`signdate` int unsigned NOT NULL default 0 COMMENT '등록일',
	PRIMARY KEY (`uid`),
	KEY order_num (`order_num`)
) DEFAULT CHARSET=utf8 COMMENT='배송추적 API 연동 로그';

-- Simplified vs legacy mallRN_db_error_log (drops the `id` actor column —
-- a Prisma client extension has no request-scoped admin session to attach,
-- unlike PHP's global session state).
CREATE TABLE `mallRN_db_error_log` (
	`uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
	`name` varchar(100) NOT NULL default '' COMMENT '발생 위치',
	`status` tinyint unsigned NOT NULL default 0 COMMENT '0(미처리),1(처리완료)',
	`message` text NOT NULL COMMENT '에러 메시지',
	`signdate` int unsigned NOT NULL default 0 COMMENT '등록일',
	PRIMARY KEY (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='DB 오류 로그';
