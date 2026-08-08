import { createDeliveryExcelBuffer } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";

export async function GET(): Promise<Response> {
  await requireAdmin();
  const buffer = await createDeliveryExcelBuffer();
  const filename = `order_delivery_${new Date().toISOString().slice(0, 10).replaceAll("-", "")}.xlsx`;
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"` } });
}
