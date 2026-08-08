CREATE TABLE `mallRN_goods_recent_view` (
	`uid` int unsigned NOT NULL AUTO_INCREMENT,
	`check_id` varchar(50) NOT NULL default '',
	`g_uid` int unsigned NOT NULL default 0,
	`signdate` int unsigned NOT NULL default 0,
	PRIMARY KEY (`uid`),
	UNIQUE KEY `check_id_g_uid` (`check_id`, `g_uid`),
	KEY `check_id_signdate` (`check_id`, `signdate`)
) DEFAULT CHARSET=utf8mb4 COMMENT='최근본 상품';

CREATE TABLE `mallRN_goods_view` (
	`uid` int unsigned NOT NULL AUTO_INCREMENT,
	`check_id` varchar(50) NOT NULL default '',
	`g_uid` int unsigned NOT NULL default 0,
	`vendor` varchar(50) NOT NULL default '',
	`mobile` enum('Y','N') NOT NULL default 'N',
	`signdate` int unsigned NOT NULL default 0,
	PRIMARY KEY (`uid`),
	KEY `viewer_goods_date` (`check_id`, `g_uid`, `signdate`)
) DEFAULT CHARSET=utf8mb4 COMMENT='상품 조회 카운트';
