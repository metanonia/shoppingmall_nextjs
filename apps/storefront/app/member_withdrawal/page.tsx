import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { MemberWithdrawalForm } from "@/components/MemberWithdrawalForm";

export default async function MemberWithdrawalPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect_to=/member_withdrawal");

  return <MemberWithdrawalForm />;
}
