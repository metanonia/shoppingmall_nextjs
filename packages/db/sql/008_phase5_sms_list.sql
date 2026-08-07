-- SMS send log for Phase 5 (payment/notifications). Source of truth:
-- shoppingmall_php/install/install_post.php (mallRN_sms_list 1824-1843).
--
-- This is both an audit log and the concrete evidence of the "no coolSMS
-- credentials configured -> skip gracefully" behavior in packages/core/src
-- sms.ts: skipped sends are logged here with result='SKIPPED_NO_CREDENTIALS'
-- instead of throwing.
--
-- The legacy DDL has a copy-paste typo (`NOT NULL NULL default '0'` on
-- result_code/status) — cleaned up to `NOT NULL default '0'` here.

CREATE TABLE `mallRN_sms_list` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `cell` varchar(50) NOT NULL default '' COMMENT '수신번호',
  `message` text NOT NULL COMMENT '발송내용',
  `type` int unsigned NOT NULL default '0' COMMENT '타입 0(SMS), 1(LMS)',
  `groupId` varchar(50) NOT NULL default '' COMMENT '그룹 아이디',
  `messageId` varchar(50) NOT NULL default '' COMMENT '메세지 아이디',
  `accountId` varchar(50) NOT NULL default '' COMMENT '계정 고유 번호',
  `result` varchar(250) NOT NULL default '' COMMENT '결과',
  `result_code` int unsigned NOT NULL default '0' COMMENT '결과코드(2000 : 정상접수, 3000 : 이통사로 접수 완료(정상), 4000 : 수신자가 메시지를 수신함)',
  `status` int unsigned NOT NULL default '0' COMMENT '상태 0(전송중), 1(전송완료)',
  `received_date` int unsigned NOT NULL default '0' COMMENT '수신일시',
  `signdate` int unsigned NOT NULL default '0' COMMENT '등록일시',
  PRIMARY KEY (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='문자발송내역';
