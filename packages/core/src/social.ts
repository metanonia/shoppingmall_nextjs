import { prisma } from "@shoppingmall/db";
import type { SocialAppConfig, SocialProvider } from "@shoppingmall/auth";

// Port of php/login.php:11-17 / regist.php:30-36's per-provider `used` check
// against mallRN_configuration_social — legacy shows a login button only
// when a site row exists with used=1. Every row is empty/used=0 until real
// OAuth credentials are configured (see MIGRATION.md), so this naturally
// returns an empty list today and the storefront shows no social buttons.
export async function getEnabledSocialProviders(): Promise<SocialProvider[]> {
  const rows = await prisma.configurationSocial.findMany({ where: { used: 1 } });
  const bySite: Record<string, SocialProvider> = { NAVER: "naver", KAKAO: "kakao", GOOGLE: "google", PAYCO: "payco" };
  return rows.map((r) => bySite[r.site]).filter((p): p is SocialProvider => Boolean(p));
}

export async function getSocialAppConfig(provider: SocialProvider, redirectUri: string): Promise<SocialAppConfig | null> {
  const site = { naver: "NAVER", kakao: "KAKAO", google: "GOOGLE", payco: "PAYCO" }[provider];
  const row = await prisma.configurationSocial.findFirst({ where: { site, used: 1 } });
  if (!row || !row.api_id || !row.api_key) return null;
  return { clientId: row.api_id, clientSecret: row.api_key, redirectUri };
}
