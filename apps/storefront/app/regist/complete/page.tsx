// Port of php/regist_ok.php — legacy shows a dedicated welcome page instead
// of dropping straight back to the homepage after signup.
export default async function RegistCompletePage({ searchParams }: { searchParams: Promise<{ name?: string }> }) {
  const { name } = await searchParams;

  return (
    <div id="contents">
      <h2 className="contentTitle">회원가입 완료</h2>
      <div className="empty30" />
      <p style={{ textAlign: "center" }}>
        {name && <b>{name}</b>}
        {name && "님, "}
        회원가입이 완료되었습니다.
      </p>
      <div className="empty30" />
      <div style={{ textAlign: "center" }}>
        <a className="fontSCDream weight300 shine black" href="/" style={{ display: "inline-block" }}>
          쇼핑 계속하기
        </a>
      </div>
    </div>
  );
}
