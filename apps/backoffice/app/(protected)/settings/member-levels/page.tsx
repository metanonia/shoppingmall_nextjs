import { getMemberLevelList } from "@shoppingmall/core";
import { MemberLevelTable, RecalculateLevelsForm } from "@/components/MemberLevelSettingsForm";

export default async function MemberLevelsPage() {
  const levels = await getMemberLevelList();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>회원등급 설정</h1>
      <MemberLevelTable levels={levels} />

      <div className="empty30" />
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>자동등급 일괄산정</h2>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
        선택한 기간 동안의 누적 구매금액을 기준으로 &quot;자동승급 기준금액&quot;이 설정된 등급을
        재평가합니다. 기준금액이 0인 등급은 이 산정에서 자동으로 부여되지 않습니다.
      </div>
      <RecalculateLevelsForm />
    </div>
  );
}
