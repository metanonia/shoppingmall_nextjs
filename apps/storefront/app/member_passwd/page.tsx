import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { MemberPasswdForm } from "@/components/MemberPasswdForm";

export default async function MemberPasswdPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect_to=/member_passwd");

  return <MemberPasswdForm />;
}
