import { NextResponse } from "next/server";
import { buildMemberExportXlsx, getAdminMemberExportRows } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request): Promise<NextResponse> {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") ?? undefined;

  const items = await getAdminMemberExportRows({ keyword });
  const buffer = await buildMemberExportXlsx(items);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="members.xlsx"',
    },
  });
}
