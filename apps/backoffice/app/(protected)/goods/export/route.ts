import { NextResponse } from "next/server";
import { buildGoodsExportXlsx, getAdminGoodsExportRows } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request): Promise<NextResponse> {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") ?? undefined;
  const pending = searchParams.get("pending") === "1";

  const items = await getAdminGoodsExportRows({ keyword, authCk: pending ? "N" : undefined });
  const buffer = await buildGoodsExportXlsx(items);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="goods.xlsx"',
    },
  });
}
