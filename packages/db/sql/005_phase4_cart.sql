-- Cart table for Phase 4 (cart/order engine). Source of truth:
-- shoppingmall_php/install/install_post.php (mallRN_cart 278-292).
--
-- No price snapshot here — matches legacy: price/stock/discount are always
-- recomputed live from mallRN_goods/mallRN_goods_option when the cart is
-- read (see packages/core/src/cart.ts getCartGoodsInfo).

CREATE TABLE `mallRN_cart` (
  `uid` int unsigned NOT NULL AUTO_INCREMENT COMMENT '고유값',
  `vendor` varchar(50) NOT NULL default '' COMMENT '판매사 아이디',
  `vendor_delivery` varchar(50) NOT NULL default '' COMMENT '배송 판매사 아이디',
  `cart_id` varchar(50) NOT NULL default '' COMMENT '장바구니 임시 아이디',
  `g_uid` int unsigned NOT NULL default '0' COMMENT '상품 고유값',
  `g_cate` bigint unsigned NOT NULL default '0' COMMENT '상품분류번호',
  `qty` int unsigned NOT NULL default '0' COMMENT '구매수량',
  `option` int unsigned NOT NULL default '0' COMMENT '옵션고유값',
  `direct` tinyint unsigned DEFAULT '0' NOT NULL COMMENT '바로구매 여부 0(일반구매), 1(바로구매)',
  `selects` tinyint unsigned DEFAULT '0' NOT NULL COMMENT '선택구매 여부 0(일반구매), 1(선택구매)',
  `contact` tinyint unsigned DEFAULT '0' NOT NULL COMMENT '최종적용 여부 0(기본), 1(최종)',
  `signdate` int unsigned NOT NULL default '0' COMMENT '등록일시',
  PRIMARY KEY (`uid`)
) DEFAULT CHARSET=utf8 COMMENT='장바구니 정보';
