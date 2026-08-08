import { GoodsExcelImportForm } from "@/components/GoodsExcelImportForm";
import { importVendorGoodsExcelAction } from "./actions";

export default function VendorGoodsImportPage() {
  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>상품 엑셀 일괄등록</h1>
      <GoodsExcelImportForm action={importVendorGoodsExcelAction} sampleHref="/vendor/goods/import/sample" />
    </div>
  );
}
