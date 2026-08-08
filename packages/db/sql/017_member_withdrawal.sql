-- PHP install/install_post.php의 mallRN_member_withdrawal 및
-- php/regist_post.php mode=withdrawal 감사 이력을 이식한다.
CREATE TABLE `mallRN_member_withdrawal` (
	`uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
	`id` varchar(50) NOT NULL default '' COMMENT '아이디',
	`name` varchar(50) NOT NULL default '' COMMENT '이름',
	`reason` varchar(50) NOT NULL default '' COMMENT '탈퇴사유',
	`order_cnt` int unsigned NOT NULL default 0 COMMENT '주문횟수',
	`message` text NOT NULL COMMENT '하고싶은 말',
	`mobile` enum('Y','N') NOT NULL default 'N' COMMENT '모바일가입자',
	`signdate` int unsigned NOT NULL default 0 COMMENT '등록일',
	PRIMARY KEY (`uid`),
	KEY `id` (`id`)
) DEFAULT CHARSET=utf8mb4 COMMENT='회원탈퇴 정보';
