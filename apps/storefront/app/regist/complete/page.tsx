import Link from "next/link";

// Port of php/regist_ok.php — legacy shows a dedicated welcome page instead
// of dropping straight back to the homepage after signup.
export default async function RegistCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; status?: string; mileage?: string }>;
}) {
  const { name, status, mileage: mileageParam } = await searchParams;
  const pending = status === "pending";
  const mileage = Number(mileageParam ?? 0) || 0;

  return (
    <div id="contents">
      <h2 className="contentTitle">회원가입 완료</h2>
      <div className="empty30" />
      <p style={{ textAlign: "center" }}>
        {name && <b>{name}</b>}
        {name && "님, "}
        회원가입이 완료되었습니다.
      </p>
      {!pending && mileage > 0 && (
        <p style={{ textAlign: "center" }}>회원가입 축하 마일리지 {mileage.toLocaleString("ko-KR")}P가 적립되었습니다.</p>
      )}
      <p className="lineHeight colorGray center" style={{ textAlign: "center" }}>
        {pending ? (
          <>
            회원가입은 완료되었으나 현재 미승인 상태입니다.
            <br />
            관리자 승인 후 로그인 및 회원 기능을 이용할 수 있습니다.
          </>
        ) : (
          <>
            마이페이지에서 회원 정보를 변경하거나 탈퇴할 수 있습니다.
            <br />
            회원님의 정보는 개인정보 처리방침에 따라 보호됩니다.
          </>
        )}
      </p>
      <div className="empty30" />
      <div style={{ textAlign: "center" }}>
        <Link className="fontSCDream weight300 shine black" href="/" style={{ display: "inline-block" }}>
          쇼핑 계속하기
        </Link>
        {!pending && (
          <Link
            className="fontSCDream weight300 shine"
            href="/mypage"
            style={{ display: "inline-block", marginLeft: 10 }}
          >
            마이페이지
          </Link>
        )}
      </div>
    </div>
  );
}
