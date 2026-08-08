CREATE TABLE `mallRN_sms_auto` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL DEFAULT '',
  `title` varchar(100) NOT NULL DEFAULT '',
  `message1` text NOT NULL,
  `message2` text NOT NULL,
  `ck_message1` int unsigned NOT NULL DEFAULT 0,
  `ck_message2` int unsigned NOT NULL DEFAULT 0,
  `type` int unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`uid`),
  UNIQUE KEY `code` (`code`)
) DEFAULT CHARSET=utf8mb4 COMMENT='문자알림설정';

INSERT INTO `mallRN_sms_auto` (`code`,`title`,`message1`,`message2`,`ck_message1`,`ck_message2`,`type`) VALUES
('regist','회원가입','[{SHOPNAME}]\n{NAME} 회원님의 가입을 진심으로 축하드립니다!','[{SHOPNAME}]\n{NAME} 회원님이 신규가입하셨습니다!',0,0,0),
('authcode','인증코드','[{SHOPNAME}]\n인증번호는 {AUTHCODE} 입니다.','',1,0,1),
('order','무통장 주문접수','[{SHOPNAME}]\n{ORDER_NAME}님의 {ORDER_NUM} 주문이 접수되었습니다. {PRICE}원을 {ACCOUNT}으로 입금 부탁드립니다.','[{SHOPNAME}]\n{ORDER_NAME}님의 {ORDER_NUM} / {PRICE}원 주문이 접수되었습니다.',0,0,0),
('bank_ok','무통장 입금확인','[{SHOPNAME}]\n{ORDER_NAME}님의 {ORDER_NUM} 주문의 입금이 확인되었습니다.','',0,0,1),
('pay_ok','결제완료(무통장제외)','[{SHOPNAME}]\n{ORDER_NAME}님의 {ORDER_NUM} 주문의 결제가 완료되었습니다.','[{SHOPNAME}]\n{ORDER_NAME}님의 {ORDER_NUM} / {PRICE}원 주문의 결제가 완료되었습니다.',0,0,0),
('pay_ok2','결제완료시 판매사통보','[{SHOPNAME}]\n{ORDER_NAME}님의 주문이 접수되었습니다. 확인해 주시기 바랍니다.','',0,0,1),
('delivery','상품발송','[{SHOPNAME}]\n{ORDER_NAME}님 신청하신 {GOODS_NAME}이 발송되었습니다. ({DELIVERY_NAME}: {DELIVERY_NUM})','',1,0,1);
