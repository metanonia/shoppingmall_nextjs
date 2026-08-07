-- Tables for the deferred items picked up now that member auth (Phase 3)
-- exists: favorites, product inquiry, popup display, and search
-- recent/popularity logs. Source of truth:
-- shoppingmall_php/install/install_post.php (favorite_goods 851-860,
-- favorite_store 868-876, inquiry 1050-1069, mobile_popup 1419-1437,
-- keyword_recent 1097-1108, keyword_search 1129-1138).
--
-- Intentionally NOT added here (see MIGRATION.md):
-- mallRN_keyword_recent2 (admin-only audit log, never read by any UI),
-- mallRN_keyword_autocomplete (its auto-collection pipeline derives
-- fragments from best-selling goods names — deferred; autocomplete in
-- this repo is powered by mallRN_keyword_search directly instead).

CREATE TABLE `mallRN_favorite_goods` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `id` varchar(50) NOT NULL default '' COMMENT '아이디',
  `g_uid` int unsigned NOT NULL default '0' COMMENT '상품 고유값',
  `vendor` varchar(50) NOT NULL default '' COMMENT '판매사 아이디',
  `mobile` enum('Y','N') NOT NULL default 'N' COMMENT '모바일가입자 Y(모바일), N(PC)',
  `signdate` int unsigned NOT NULL default '0' COMMENT '등록일시',
  PRIMARY KEY (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='관심상품';

CREATE TABLE `mallRN_favorite_store` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `id` varchar(50) NOT NULL default '' COMMENT '아이디',
  `vendor` varchar(50) NOT NULL default '' COMMENT '판매사 아이디',
  `mobile` enum('Y','N') NOT NULL default 'N' COMMENT '모바일가입자 Y(모바일), N(PC)',
  `signdate` int unsigned NOT NULL default '0' COMMENT '등록일시',
  PRIMARY KEY (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='관심스토어';

CREATE TABLE `mallRN_inquiry` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `vendor` varchar(50) NOT NULL default '' COMMENT '판매사 아이디',
  `g_uid` int unsigned NOT NULL default '0' COMMENT '상품 고유값',
  `g_name` varchar(100) NOT NULL default '' COMMENT '상품명',
  `id` varchar(50) NOT NULL default '' COMMENT '아이디',
  `name` varchar(50) NOT NULL default '' COMMENT '이름',
  `passwd` varchar(100) NOT NULL default '' COMMENT '비밀번호(MD5)',
  `cate` tinyint unsigned DEFAULT '0' NOT NULL COMMENT '분류번호',
  `subject` varchar(250) NOT NULL default '' COMMENT '제목',
  `contact` varchar(50) NOT NULL default '' COMMENT '연락처',
  `content` text NOT NULL COMMENT '내용',
  `answer` text NOT NULL COMMENT '답변',
  `secret` tinyint unsigned DEFAULT '0' NOT NULL COMMENT '비밀글 0(일반글), 1(비밀글)',
  `files` text COMMENT '업로드 파일 (파일명,파일명,...)',
  `acc_ip` varchar(50) NOT NULL default '' COMMENT '접속 아이피',
  `signdate` int unsigned NOT NULL default '0' COMMENT '등록일시',
  PRIMARY KEY (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='상품문의';

CREATE TABLE `mallRN_mobile_popup` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `name` varchar(80) NOT NULL default '' COMMENT '팝업명',
  `status` int unsigned NOT NULL default '0' COMMENT '상태 0(사용), 1(사용안함), 2(기간종료)',
  `type` int unsigned NOT NULL default '0' COMMENT '형태 0(항상), 1(하루에 한번)',
  `period` int unsigned NOT NULL default '0' COMMENT '기간 0(무기한), 1(특정기간)',
  `s_date` datetime default '1000-01-01 00:00:00' COMMENT '팝업 시작시간',
  `e_date` datetime default '1000-01-01 00:00:00' COMMENT '팝업 종료시간',
  `position` int unsigned NOT NULL default '0' COMMENT '위치 0(중앙), 1(하단)',
  `input_position` varchar(50) NOT NULL default '' COMMENT '입력위치 (상단위치|좌측위치)',
  `input_size` varchar(50) NOT NULL default '' COMMENT '창사이즈 (가로|세로)',
  `image_only` tinyint unsigned NOT NULL default '0' COMMENT '방식 0(웹에디터), 1(이미지)',
  `image1` varchar(100) NOT NULL default '' COMMENT '이미지',
  `link1` varchar(250) NOT NULL default '' COMMENT '이동 url',
  `content` text NOT NULL COMMENT '내용',
  `signdate` int unsigned NOT NULL default '0' COMMENT '등록일시',
  PRIMARY KEY (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='모바일 팝업 정보';

CREATE TABLE `mallRN_keyword_search` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `keyword` varchar(100) NOT NULL default '' COMMENT '키워드',
  `count` int unsigned NOT NULL default '0' COMMENT '검색카운터',
  `date` datetime default '1000-01-01 00:00:00' COMMENT '등록일',
  PRIMARY KEY (`uid`),
  KEY `keyword` (`keyword`)
) DEFAULT CHARSET=utf8 COMMENT='고객 검색어';

CREATE TABLE `mallRN_keyword_recent` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `keyword` varchar(100) NOT NULL default '' COMMENT '키워드',
  `id` varchar(50) NOT NULL default '' COMMENT '회원 아이디',
  `ip` varchar(20) NOT NULL default '' COMMENT '등록아이피',
  `signdate` int unsigned NOT NULL default '0' COMMENT '등록일',
  PRIMARY KEY (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='고객 최근 검색어(고객용)';
