import { NextResponse } from "next/server";
import { buildMemberExcelSample } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export async function GET(): Promise<NextResponse> {
  await requireAdmin();
  const buffer = await buildMemberExcelSample();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="member_excel_sample.xlsx"',
    },
  });
}
