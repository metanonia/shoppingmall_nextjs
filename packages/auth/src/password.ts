import { hash, verify } from "@node-rs/argon2";

// Legacy stores `passwd` as plain MD5 (lib.Shop.php's makeLogin() /
// mallRN_member.passwd COMMENT 'MD5'). This is a fresh install with no
// existing accounts to migrate, so there's no MD5 compatibility path here —
// every account, from the first one, is argon2id. See migration_deferred_items
// memory / MIGRATION.md for context if that ever needs revisiting.
export async function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    return false;
  }
}
