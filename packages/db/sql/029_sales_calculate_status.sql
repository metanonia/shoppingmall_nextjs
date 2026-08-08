ALTER TABLE `mallRN_sales_calculate`
  ADD COLUMN `tax_bill` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '세금계산서 0 미발행, 1 발행완료' AFTER `bank_owner`,
  ADD COLUMN `type` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '등록방식 0 자동, 1 수동' AFTER `tax_bill`,
  ADD COLUMN `status` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '정산상태 0 대기, 1 완료' AFTER `type`,
  ADD COLUMN `status_date` int unsigned NOT NULL DEFAULT 0 COMMENT '정산완료일시' AFTER `status`;
