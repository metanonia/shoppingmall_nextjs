-- PHP install/install_post.php의 구매후기 테이블을 이식한다.
-- og_uid는 한 주문상품당 후기 하나만 허용하는 PHP 화면 규칙을 DB에서도 보장한다.
CREATE TABLE `mallRN_review` (
	`uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
	`vendor` varchar(50) NOT NULL default '' COMMENT '판매사 아이디',
	`og_uid` int unsigned NOT NULL default 0 COMMENT '주문상품 고유값',
	`g_uid` int unsigned NOT NULL default 0 COMMENT '상품 고유값',
	`g_name` varchar(100) NOT NULL default '' COMMENT '상품명',
	`op_name` varchar(100) NOT NULL default '' COMMENT '상품옵션명',
	`id` varchar(50) NOT NULL default '' COMMENT '아이디',
	`name` varchar(50) NOT NULL default '' COMMENT '이름',
	`passwd` varchar(100) NOT NULL default '' COMMENT '비밀번호',
	`content` text NOT NULL COMMENT '내용',
	`files` text COMMENT '업로드 파일',
	`stars` int unsigned NOT NULL default 0 COMMENT '별점',
	`best` int unsigned NOT NULL default 0 COMMENT '베스트 리뷰',
	`acc_ip` varchar(50) NOT NULL default '' COMMENT '접속 아이피',
	`signdate` int unsigned NOT NULL default 0 COMMENT '등록일시',
	PRIMARY KEY (`uid`),
	UNIQUE KEY `og_uid` (`og_uid`),
	KEY `g_uid` (`g_uid`),
	KEY `id` (`id`)
) DEFAULT CHARSET=utf8mb4 COMMENT='구매후기';
