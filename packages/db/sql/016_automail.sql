CREATE TABLE `mallRN_auto_mail` (
	`uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
	`type` varchar(50) NOT NULL default '' COMMENT '타입',
	`used` tinyint unsigned NOT NULL default '0' COMMENT '커스텀 템플릿 사용여부 0(기본 템플릿), 1(아래 subject/content 사용)',
	`subject` varchar(150) NOT NULL default '' COMMENT '메일발송 제목',
	`content` text NOT NULL COMMENT '내용',
	`signdate` int unsigned NOT NULL default 0 COMMENT '등록일/수정일',
	PRIMARY KEY (`uid`),
	UNIQUE KEY `type` (`type`)
) DEFAULT CHARSET=utf8mb4 COMMENT='자동메일 발송 디자인 설정 정보';

INSERT INTO `mallRN_auto_mail` (`uid`, `type`, `used`, `subject`, `content`, `signdate`) VALUES
(1, 'order_received', 0, '', '', 0),
(2, 'order_paid', 0, '', '', 0),
(3, 'passwd', 0, '', '', 0),
(4, 'sleep', 0, '', '', 0);

-- Per-admin dashboard widget layout (managers/index.php's 위젯배치). Legacy's
-- push_yn/token_pc/token_mobile (web-push FCM tokens) columns are dropped —
-- push notifications were already scoped out (migration_deferred_items).
CREATE TABLE `mallRN_admin_configuration` (
	`uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
	`id` varchar(50) NOT NULL default '' COMMENT '아이디',
	`widget_info` text NOT NULL COMMENT '위젯정보',
	PRIMARY KEY (`uid`),
	UNIQUE KEY `id` (`id`)
) DEFAULT CHARSET=utf8mb4 COMMENT='관리자 설정 정보';
