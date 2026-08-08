import { redirect } from "next/navigation";
import { getMemberFormConfig, getMemberProfile } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";
import { MemberModifyForm } from "@/components/MemberModifyForm";

export default async function MemberModifyPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect_to=/member_modify");

  const [profile, config] = await Promise.all([getMemberProfile(session.userId), getMemberFormConfig()]);
  if (!profile) redirect("/login?redirect_to=/member_modify");

  return <MemberModifyForm profile={profile} config={config} />;
}
