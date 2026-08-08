import ExcelJS from "exceljs";
import type { AdminGoodsListItem } from "./goods-admin";
import type { AdminMemberListItem } from "./member-admin";
import type { AdminOrderListItem } from "./order-admin";

// Port of the "엑셀 다운로드" buttons on managers/goods/goods_list.php,
// managers/member/member_list.php, managers/order/order_list.php — legacy
// streams these via PHPExcel; this repo generates the same workbook shape
// with exceljs (already a dependency from F4/H4's bulk-import screens) and
// returns a Buffer for the caller's route handler to stream back.
function unixToDate(unixSeconds: number): Date | null {
  return unixSeconds > 0 ? new Date(unixSeconds * 1000) : null;
}

async function buildWorkbookBuffer(headers: string[], rows: (string | number | Date | null)[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("export");
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildGoodsExportXlsx(items: AdminGoodsListItem[]): Promise<Buffer> {
  const headers = ["상품UID", "상품명", "입점사", "판매가", "재고", "진열", "판매", "승인상태", "등록일"];
  const rows = items.map((i) => [
    i.uid,
    i.name,
    i.vendor || "직영",
    i.price,
    i.qty,
    i.displayUse ? "Y" : "N",
    i.saleUse ? "Y" : "N",
    i.authCk,
    unixToDate(i.signdate),
  ]);
  return buildWorkbookBuffer(headers, rows);
}

export async function buildMemberExportXlsx(items: AdminMemberListItem[]): Promise<Buffer> {
  const headers = ["아이디", "이름", "이메일", "연락처", "등급", "마일리지", "가입일"];
  const rows = items.map((i) => [i.id, i.name, i.email, i.cell, i.level, i.mileage, unixToDate(i.signdate)]);
  return buildWorkbookBuffer(headers, rows);
}

export async function buildOrderExportXlsx(items: AdminOrderListItem[]): Promise<Buffer> {
  const headers = ["주문번호", "구매자", "수령인", "결제수단", "결제상태", "결제금액", "주문상품", "주문일시"];
  const rows = items.map((i) => [i.orderNum, i.buyerId, i.name, i.payType, i.payStatus, i.payTotal, i.itemSummary, unixToDate(i.signdate)]);
  return buildWorkbookBuffer(headers, rows);
}
