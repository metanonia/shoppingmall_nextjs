import { NextResponse } from "next/server";
import { buildOrderExportXlsx, getAdminOrderExportRows } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request): Promise<NextResponse> {
  await requireAdmin();
  const { searchParams } = new URL(request.url);

  const items = await getAdminOrderExportRows({
    keyword: searchParams.get("keyword") ?? undefined,
    payStatus: (searchParams.get("payStatus") as "A" | "B" | "C" | "D" | null) ?? undefined,
    payType: (searchParams.get("payType") as "B" | "C" | "R" | "V" | "H" | "M" | null) ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    status: searchParams.get("status") ? Number(searchParams.get("status")) : undefined,
  });
  const buffer = await buildOrderExportXlsx(items);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="orders.xlsx"',
    },
  });
}
