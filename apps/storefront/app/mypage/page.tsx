import { redirect } from "next/navigation";
import { getMemberProfile } from "@shoppingmall/core";
import { getSession } from "@/lib/auth";

// Port of php/mypage.php, scoped down to what's actually built: profile
// summary + account-management + favorites/inquiry links. Legacy's
// mileage/coupon/recent-view/review/counsel widgets each still need their
// own not-yet-built table — see MIGRATION.md — so they're left out rather
// than linked to dead pages.
export default async function MyPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect_to=/mypage");

  const profile = await getMemberProfile(session.userId);
  if (!profile) redirect("/login?redirect_to=/mypage");

  return (
    <div id="contents">
      <h2 className="contentTitle">MY SHOP</h2>

      <div className="empty30" />
      <p>
        <b>{profile.name}</b>님, 안녕하세요.
      </p>
      <div className="empty10" />
      <ul>
        <li>아이디: {profile.id}</li>
        <li>이메일: {profile.email}</li>
        <li>마일리지: {profile.mileage.toLocaleString("en-US")}</li>
      </ul>

      <div className="empty30" />
      <ul>
        <li>
          <a href="/member_modify" className="underLine">
            회원정보 수정
          </a>
        </li>
        <li>
          <a href="/member_passwd" className="underLine">
            비밀번호 변경
          </a>
        </li>
        <li>
          <a href="/member_withdrawal" className="underLine">
            회원탈퇴
          </a>
        </li>
        <li>
          <a href="/my_favorite_goods" className="underLine">
            관심상품
          </a>
        </li>
        <li>
          <a href="/my_favorite_store" className="underLine">
            관심스토어
          </a>
        </li>
        <li>
          <a href="/my_inquiry" className="underLine">
            상품문의내역
          </a>
        </li>
      </ul>
    </div>
  );
}
