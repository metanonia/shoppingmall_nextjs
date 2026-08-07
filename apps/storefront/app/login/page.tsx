import { getEnabledSocialProviders } from "@shoppingmall/core";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const redirectTo = (Array.isArray(params.redirect_to) ? params.redirect_to[0] : params.redirect_to) || "/";
  const socialProviders = await getEnabledSocialProviders();

  return <LoginForm redirectTo={redirectTo} socialProviders={socialProviders} />;
}
