import { GoodsExcelImportForm } from "@/components/GoodsExcelImportForm";
import { importMemberExcelAction } from "./actions";

export default function MembersImportPage() {
  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>회원 엑셀 일괄등록</h1>
      <GoodsExcelImportForm
        action={importMemberExcelAction}
        sampleHref="/members/import/sample"
        description="첫 행은 헤더(변경 불가), 둘째 행부터 회원 데이터를 입력합니다. 이미 존재하는 아이디는 등록되지 않고 실패 목록에 표시됩니다."
        submitLabel="회원 등록하기"
        nameColumnLabel="이름"
      />
    </div>
  );
}
