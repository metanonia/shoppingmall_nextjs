import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildAuthorizeUrl, SOCIAL_PROVIDERS, type SocialProvider } from "@shoppingmall/auth";
import { getSocialAppConfig } from "@shoppingmall/core";

const STATE_COOKIE = "oauth_state";

// Port of plugin/social/{provider}_login.php's redirect-to-provider step
// (legacy opens this in a popup window; this is a full-page redirect, the
// standard modern OAuth pattern instead).
export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!SOCIAL_PROVIDERS.includes(provider as SocialProvider)) {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }

  const redirectUri = new URL(`/auth/${provider}/callback`, request.url).toString();
  const config = await getSocialAppConfig(provider as SocialProvider, redirectUri);
  if (!config) {
    return NextResponse.json({ error: `${provider} 로그인이 설정되지 않았습니다.` }, { status: 404 });
  }

  const state = crypto.randomUUID();
  const store = await cookies();
  store.set(STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });

  return NextResponse.redirect(buildAuthorizeUrl(provider as SocialProvider, config, state));
}
