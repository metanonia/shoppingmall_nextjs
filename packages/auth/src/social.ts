// Port of plugin/social/{naver,kakao,google,payco}_login.php, which all use
// the vendored `hybridauth` library to run a standard OAuth2 authorization-code
// flow. This reimplements that flow directly against each provider's real
// endpoints instead of depending on hybridauth.
//
// No real OAuth app credentials exist for any provider yet (see
// migration_deferred_items memory / MIGRATION.md) — this has not been
// exercised against a live provider. The endpoints/response shapes below
// are each provider's documented OAuth2 API as of this writing; re-verify
// against the real API docs once credentials are available and this gets
// its first live test.

export type SocialProvider = "naver" | "kakao" | "google" | "payco";

export const SOCIAL_PROVIDERS: SocialProvider[] = ["naver", "kakao", "google", "payco"];

type ProviderEndpoints = {
  authorizeUrl: string;
  tokenUrl: string;
  profileUrl: string;
  scope?: string;
};

const ENDPOINTS: Record<SocialProvider, ProviderEndpoints> = {
  naver: {
    authorizeUrl: "https://nid.naver.com/oauth2.0/authorize",
    tokenUrl: "https://nid.naver.com/oauth2.0/token",
    profileUrl: "https://openapi.naver.com/v1/nid/me",
  },
  kakao: {
    authorizeUrl: "https://kauth.kakao.com/oauth/authorize",
    tokenUrl: "https://kauth.kakao.com/oauth/token",
    profileUrl: "https://kapi.kakao.com/v2/user/me",
  },
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    profileUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    scope: "openid email profile",
  },
  payco: {
    authorizeUrl: "https://id.payco.com/oauth2.0/authorize",
    tokenUrl: "https://id.payco.com/oauth2.0/token",
    profileUrl: "https://id.payco.com/oauth2.0/user/me",
  },
};

export type SocialAppConfig = { clientId: string; clientSecret: string; redirectUri: string };

export function buildAuthorizeUrl(provider: SocialProvider, config: SocialAppConfig, state: string): string {
  const endpoints = ENDPOINTS[provider];
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    state,
  });
  if (endpoints.scope) params.set("scope", endpoints.scope);
  return `${endpoints.authorizeUrl}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  provider: SocialProvider,
  config: SocialAppConfig,
  code: string,
): Promise<{ accessToken: string }> {
  const endpoints = ENDPOINTS[provider];
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  const res = await fetch(endpoints.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`${provider} token exchange failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return { accessToken: data.access_token };
}

export type SocialProfile = { id: string; name: string; email?: string };

// Each provider wraps the profile payload differently — normalized here so
// findOrCreateSocialMember (packages/core/src/member.ts) doesn't need to
// know which provider it came from.
export async function fetchSocialProfile(provider: SocialProvider, accessToken: string): Promise<SocialProfile> {
  const endpoints = ENDPOINTS[provider];
  const res = await fetch(endpoints.profileUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`${provider} profile fetch failed: ${res.status}`);
  const data = await res.json();

  switch (provider) {
    case "naver": {
      const p = data.response;
      return { id: p.id, name: p.name, email: p.email };
    }
    case "kakao": {
      const account = data.kakao_account ?? {};
      return { id: String(data.id), name: account.profile?.nickname ?? "", email: account.email };
    }
    case "google":
      return { id: data.sub, name: data.name, email: data.email };
    case "payco": {
      const p = data.data?.member ?? {};
      return { id: p.idNo, name: p.name };
    }
  }
}
