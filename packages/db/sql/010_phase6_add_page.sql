-- Admin-authored static pages (회사소개 etc.) for Phase 6. Source of truth:
-- shoppingmall_php/install/install_post.php (mallRN_add_page 46-61) — a real
-- literal legacy table, unlike the board tables in 009 (this one isn't
-- dynamically created per-instance).
--
-- No admin CRUD UI exists yet (Phase 7) — content is seed-data only, same
-- principle as mallRN_popup (Phase 1/3).

CREATE TABLE `mallRN_add_page` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `title` varchar(100) NOT NULL default '' COMMENT '제목',
  `detail_image` text NOT NULL COMMENT '페이지 이미지 (이미지명,이미지명,...)',
  `detail_image_only` tinyint unsigned NOT NULL default '0' COMMENT '페이지 방식 0(페이지내용직접 등록), 1(이미지로만 등록)',
  `detail_image_type` tinyint unsigned NOT NULL default '1' COMMENT '이미지간 출력 방식 1(이미지간 공백 있게 출력), 2(이미지간 공백 없이 출력)',
  `explains` text NOT NULL COMMENT '페이지내용',
  `status` tinyint unsigned NOT NULL default '0' COMMENT '상태 0(사용), 1(사용안함)',
  `signdate` int unsigned NOT NULL default '0' COMMENT '등록일',
  PRIMARY KEY (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='추가페이지';
