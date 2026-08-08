ALTER TABLE `mallRN_auto_mail`
  ADD COLUMN `send` tinyint unsigned NOT NULL DEFAULT 0
  COMMENT '자동발송여부 0(발송안함), 1(발송함)' AFTER `used`;

UPDATE `mallRN_auto_mail`
SET `send` = CASE
  WHEN `type` IN ('join', 'passwd', 'vjoin') THEN 1
  ELSE 0
END;
