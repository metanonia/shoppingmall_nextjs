import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForToken, fetchSocialProfile, SOCIAL_PROVIDERS, type SocialProvider } from "@shoppingmall/auth";
import { findOrCreateSocialMember, getSocialAppConfig } from "@shoppingmall/core";
import { createSession } from "@/lib/auth";

const STATE_COOKIE = "oauth_state";

// Port of plugin/social/{provider}_login.php's callback step (token exchange
// + profile fetch + find-or-create member). Not exercised against a live
// provider yet — see MIGRATION.md.
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!SOCIAL_PROVIDERS.includes(provider as SocialProvider)) {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const store = await cookies();
  const expectedState = store.get(STATE_COOKIE)?.value;
  store.delete(STATE_COOKIE);

  if (!code || !state || state !== expectedState) {
    return NextResponse.json({ error: "invalid oauth callback" }, { status: 400 });
  }

  const redirectUri = new URL(`/auth/${provider}/callback`, request.url).toString();
  const config = await getSocialAppConfig(provider as SocialProvider, redirectUri);
  if (!config) {
    return NextResponse.json({ error: `${provider} 로그인이 설정되지 않았습니다.` }, { status: 404 });
  }

  const { accessToken } = await exchangeCodeForToken(provider as SocialProvider, config, code);
  const profile = await fetchSocialProfile(provider as SocialProvider, accessToken);
  const member = await findOrCreateSocialMember(provider, profile.id, { name: profile.name, email: profile.email });

  await createSession({ userId: member.id, role: "member", level: member.level });

  return NextResponse.redirect(new URL("/", request.url));
}
