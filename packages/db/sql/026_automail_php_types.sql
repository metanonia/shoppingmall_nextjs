INSERT INTO `mallRN_auto_mail` (`type`, `used`, `send`, `subject`, `content`, `signdate`) VALUES
('common', 1, 0, '', '<div style="max-width:760px;margin:0 auto"><div style="border:1px solid #ccc;padding:30px 40px">{CONTENT}</div><div style="border:1px solid #ccc;border-top:0;padding:20px;background:#efefef;font-size:12px;line-height:20px">본 메일은 발신전용입니다. 문의사항은 <a href="{CSURL}">고객센터</a>로 연락해 주세요.<br>{COMPANY} | 대표: {OWNER} | 사업자등록번호: {COMPNUM}<br>{ADDRESS} | 대표번호: {TEL}<br>COPYRIGHT © {SHOPNAME} ALL RIGHTS RESERVED.</div></div>', UNIX_TIMESTAMP()),
('vjoin', 1, 1, '', '<h2>{SHOPNAME} 판매사 가입을 축하드립니다.</h2><p>{NAME}님의 판매사 아이디는 {ID}입니다.</p>', UNIX_TIMESTAMP()),
('delivery', 1, 0, '', '<h2>주문하신 상품이 발송되었습니다.</h2><p>{ORDER_DATE}에 주문하신 {GOODS_NAME} 상품이 {DELIVERY_DATE}에 발송되었습니다.</p><p>택배사: {DELIVERY_NAME}<br>송장번호: {DELIVERY_NUM}</p><p><a href="{DELIVERY_LINK}">배송조회하기</a></p><p>{RECIEVER_INFO}</p>', UNIX_TIMESTAMP())
ON DUPLICATE KEY UPDATE `type` = VALUES(`type`);
