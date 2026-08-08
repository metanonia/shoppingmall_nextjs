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

export type SocialConfigItem = { site: string; used: boolean; apiId: string; apiKey: string };

const SOCIAL_SITES = ["NAVER", "KAKAO", "GOOGLE", "PAYCO"] as const;

// Admin-facing completion of Phase 3's "구조만" social login scaffold — the
// read side (above) has worked since Phase 3, but nothing ever wrote
// mallRN_configuration_social, so every row stayed used=0 and no login
// button could ever appear. One row per site is guaranteed to exist (seeded
// at install), so this is always an update, never a create.
export async function getSocialConfigs(): Promise<SocialConfigItem[]> {
  const rows = await prisma.configurationSocial.findMany({ where: { site: { in: [...SOCIAL_SITES] } } });
  const bySite = new Map(rows.map((r) => [r.site, r]));
  return SOCIAL_SITES.map((site) => {
    const row = bySite.get(site);
    return { site, used: row?.used === 1, apiId: row?.api_id ?? "", apiKey: row?.api_key ?? "" };
  });
}

export async function updateSocialConfig(site: string, input: { used: boolean; apiId: string; apiKey: string }): Promise<void> {
  if (!SOCIAL_SITES.includes(site as (typeof SOCIAL_SITES)[number])) return;
  const data = { used: input.used ? 1 : 0, api_id: input.apiId, api_key: input.apiKey };
  const existing = await prisma.configurationSocial.findFirst({ where: { site } });
  if (existing) await prisma.configurationSocial.update({ where: { uid: existing.uid }, data });
  else await prisma.configurationSocial.create({ data: { site, ...data } });
}
