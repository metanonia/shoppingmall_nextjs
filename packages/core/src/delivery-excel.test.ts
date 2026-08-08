import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseDeliveryExcelRows } from "./order-admin";

const rows = [
  ["주문일시", "주문번호", "주문상품고유값", "송장번호"],
  ["2026-08-09", "ORD-1", 17, "TRACK-001"],
];

function workbookBuffer(bookType: "xls" | "xlsx"): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "송장등록");
  return XLSX.write(workbook, { bookType, type: "array" }) as ArrayBuffer;
}

describe("parseDeliveryExcelRows", () => {
  it.each(["xls", "xlsx"] as const)("%s 양식에서 송장 행을 읽는다", (bookType) => {
    expect(parseDeliveryExcelRows(workbookBuffer(bookType))).toEqual([
      { orderNum: "ORD-1", ogUid: 17, trackingNumber: "TRACK-001" },
    ]);
  });
});
