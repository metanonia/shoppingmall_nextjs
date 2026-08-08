ALTER TABLE `mallRN_board_comment`
  ADD COLUMN `parent_uid` int unsigned NOT NULL DEFAULT 0 AFTER `passwd`,
  ADD COLUMN `depth` int unsigned NOT NULL DEFAULT 0 AFTER `parent_uid`,
  ADD KEY `parent_uid` (`parent_uid`);
