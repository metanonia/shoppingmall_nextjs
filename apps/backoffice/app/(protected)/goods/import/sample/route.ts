import { NextResponse } from "next/server";
import { buildGoodsExcelSample } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  await requireAdmin();
  const buffer = await buildGoodsExcelSample();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="goods_excel_sample.xlsx"',
    },
  });
}
