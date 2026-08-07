-- Board posts/comments for Phase 6 (board/CMS). Hand-designed, NOT a literal
-- copy of legacy DDL — legacy dynamically CREATE TABLEs one
-- `mallRN_board_{board_id}` (+ `_comment`) pair per board instance at admin
-- creation time (board/board.php dispatches on `?b_id=`, see
-- install/install_post.php:209-241/247-263 for the per-board template this
-- is modeled on). A static ORM schema can't do runtime table creation, so
-- this collapses every board instance into one shared table pair with a
-- `board` discriminator column instead — same kind of simplification as
-- this repo's cate_parent redesign and Phase 4's real DB transactions.
--
-- Scope (see MIGRATION.md): only notice/faq/counsel/gallery are supported
-- (vnotice/vcounsel need a vendor login system that doesn't exist yet,
-- Phase 8). Legacy's `idx/main/sub/depth` zeroboard thread-sort (shifts
-- sibling rows on every reply) is replaced by flat comments with no reply
-- nesting — none of the four in-scope boards expose customer-facing nested
-- replies (only `gallery` has customer comments at all, and even there
-- legacy doesn't rely on deep threading in practice).
--
-- `passwd` uses argon2id (this repo's guest-password standard since Phase 4
-- guest checkout), not legacy's MD5.

CREATE TABLE `mallRN_board_post` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `board` varchar(20) NOT NULL default '' COMMENT '게시판 아이디 (notice/faq/counsel/gallery)',
  `notice` tinyint unsigned NOT NULL default '0' COMMENT '공지고정 0(일반),1(상단고정)',
  `category` tinyint unsigned NOT NULL default '0' COMMENT '분류번호',
  `id` varchar(50) NOT NULL default '' COMMENT '작성자 회원아이디, 게스트면 빈값',
  `name` varchar(50) NOT NULL default '' COMMENT '작성자명',
  `subject` varchar(250) NOT NULL default '' COMMENT '제목',
  `content` text NOT NULL COMMENT '내용',
  `contact` varchar(50) NOT NULL default '' COMMENT '1:1문의 연락처',
  `secret` tinyint unsigned NOT NULL default '0' COMMENT '비밀글 0/1',
  `passwd` varchar(100) NOT NULL default '' COMMENT '게스트 비밀번호(argon2id), 회원 작성글은 빈값',
  `files` text NOT NULL COMMENT '첨부파일명 (파일명|파일명|...)',
  `view_count` int unsigned NOT NULL default '0' COMMENT '조회수',
  `comment_count` int unsigned NOT NULL default '0' COMMENT '댓글수',
  `signdate` int unsigned NOT NULL default '0' COMMENT '등록일시',
  PRIMARY KEY (`uid`),
  KEY `board` (`board`)
) DEFAULT CHARSET=utf8 COMMENT='게시판 게시물 (통합 테이블, board 컬럼으로 구분)';

CREATE TABLE `mallRN_board_comment` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `post_uid` int unsigned NOT NULL default '0' COMMENT '게시물 고유값',
  `id` varchar(50) NOT NULL default '' COMMENT '작성자 회원아이디, 게스트면 빈값',
  `name` varchar(50) NOT NULL default '' COMMENT '작성자명',
  `content` text NOT NULL COMMENT '내용',
  `passwd` varchar(100) NOT NULL default '' COMMENT '게스트 비밀번호(argon2id)',
  `signdate` int unsigned NOT NULL default '0' COMMENT '등록일시',
  PRIMARY KEY (`uid`),
  KEY `post_uid` (`post_uid`)
) DEFAULT CHARSET=utf8 COMMENT='게시판 댓글 (flat, 대댓글 없음)';
