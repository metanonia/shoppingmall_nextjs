-- Legacy mallRN_vendor.passwd is varchar(50), sized for MD5 (32 chars). This
-- repo hashes every password with argon2id (~97 chars, see
-- packages/auth/src/password.ts) — mallRN_member.passwd was already
-- introspected at varchar(100) for the same reason, but mallRN_vendor's
-- never got the same treatment since nothing wrote to it until Phase 8's
-- vendor registration. Found via a real INSERT failure
-- (P2000 "value too long for column") during Playwright verification.
ALTER TABLE `mallRN_vendor` MODIFY `passwd` VARCHAR(100) NOT NULL DEFAULT '';
