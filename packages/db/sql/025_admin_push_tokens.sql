ALTER TABLE `mallRN_admin_configuration`
  ADD COLUMN `push_yn` enum('Y','N') NOT NULL DEFAULT 'N' AFTER `widget_info`,
  ADD COLUMN `token_pc` varchar(250) NOT NULL DEFAULT '' AFTER `push_yn`,
  ADD COLUMN `token_mobile` varchar(250) NOT NULL DEFAULT '' AFTER `token_pc`;
