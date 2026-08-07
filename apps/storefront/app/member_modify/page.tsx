import { redirect } from "next/navigation";
import { getMemberProfile } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";
import { MemberModifyForm } from "@/components/MemberModifyForm";

export default async function MemberModifyPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect_to=/member_modify");

  const profile = await getMemberProfile(session.userId);
  if (!profile) redirect("/login?redirect_to=/member_modify");

  return <MemberModifyForm profile={profile} />;
}
