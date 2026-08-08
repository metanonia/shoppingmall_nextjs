INSERT INTO `mallRN_auto_mail` (`type`, `used`, `subject`, `content`, `signdate`)
VALUES (
	'join', 1, '',
	'<h2>{SHOPNAME} 회원가입을 축하드립니다.</h2><p>{NAME}님의 가입 아이디는 {ID}입니다.</p><p>SMS 수신: {SMSYN} ({SMSDATE})<br>이메일 수신: {MAILYN} ({MAILDATE})</p>',
	UNIX_TIMESTAMP()
)
ON DUPLICATE KEY UPDATE `type` = VALUES(`type`);
