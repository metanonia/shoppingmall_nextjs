import { getVendorConfiguration } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";
import { VendorStoreConfigForm } from "@/components/VendorStoreConfigForm";

export default async function VendorStorePage() {
  const session = await requireVendor();
  const config = await getVendorConfiguration(session.vendorId ?? "");

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>스토어 설정</h1>
      <VendorStoreConfigForm config={config} />
    </div>
  );
}
