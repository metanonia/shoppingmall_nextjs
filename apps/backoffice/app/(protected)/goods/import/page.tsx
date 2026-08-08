import { GoodsExcelImportForm } from "@/components/GoodsExcelImportForm";
import { importGoodsExcelAction } from "./actions";

export default function GoodsImportPage() {
  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>상품 엑셀 일괄등록</h1>
      <GoodsExcelImportForm action={importGoodsExcelAction} sampleHref="/goods/import/sample" />
    </div>
  );
}
