import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function MemberSleepPage() {
  if (!(await getSession())) redirect("/login");
  return (
    <div id="contents">
      <h2 className="contentTitle">휴면회원 해제 완료</h2>
      <div className="empty30" />
      <p style={{ textAlign: "center" }}>휴면 상태가 해제되어 회원 서비스를 다시 이용할 수 있습니다.</p>
      <div className="empty20" />
      <div style={{ textAlign: "center" }}><Link href="/mypage" className="underLine">마이페이지로 이동</Link></div>
    </div>
  );
}
