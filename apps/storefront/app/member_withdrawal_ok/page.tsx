import Link from "next/link";

// Port of member_withdrawal_ok.html.
export default function MemberWithdrawalOkPage() {
  return (
    <div id="contents">
      <h2 className="contentTitle">회원탈퇴 완료</h2>
      <div className="empty30" />
      <p>회원탈퇴가 정상적으로 처리되었습니다. 이용해 주셔서 감사합니다.</p>
      <div className="empty20" />
      <Link href="/" className="underLine">
        메인으로
      </Link>
    </div>
  );
}
