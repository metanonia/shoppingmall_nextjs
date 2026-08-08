-- PHP 로그인/관리자 복원 로직은 member_sleep 행을 member로 그대로 복사한다.
-- 원본 install DDL은 목록/복원 코드가 사용하는 nondormant_time을 member 쪽에서
-- 빠뜨린 불일치가 있어 이를 보정한다.
ALTER TABLE `mallRN_member`
	ADD COLUMN `nondormant_time` int unsigned NOT NULL default 0 COMMENT '휴면해제 시간' AFTER `auth_code_time`;
