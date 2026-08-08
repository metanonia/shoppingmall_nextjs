CREATE TABLE `mallRN_visitor_event` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT,
  `visitor_key` varchar(64) NOT NULL DEFAULT '',
  `path` varchar(500) NOT NULL DEFAULT '',
  `referer` varchar(500) NOT NULL DEFAULT '',
  `site` varchar(100) NOT NULL DEFAULT '',
  `keyword` varchar(150) NOT NULL DEFAULT '',
  `browser` varchar(50) NOT NULL DEFAULT '',
  `os` varchar(50) NOT NULL DEFAULT '',
  `vendor` varchar(50) NOT NULL DEFAULT '',
  `mobile` tinyint unsigned NOT NULL DEFAULT 0,
  `date` int unsigned NOT NULL DEFAULT 0,
  `signdate` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`uid`),
  KEY `date` (`date`),
  KEY `visitor_date` (`visitor_key`,`date`),
  KEY `vendor_date` (`vendor`,`date`)
) DEFAULT CHARSET=utf8mb4 COMMENT='방문자/페이지뷰/유입 통계 이벤트';
