import { getFirebaseWebConfig, getVendorPushToken } from "@shoppingmall/core";
import { requireVendor } from "@/lib/auth";
import { PushTokenForm } from "@/components/PushTokenForm";
import { updateVendorPushAction } from "./actions";

export default async function VendorPushPage() {
  const session = await requireVendor();
  const vendorId = session.vendorId ?? session.userId;
  const [initial, config] = await Promise.all([getVendorPushToken(vendorId), getFirebaseWebConfig()]);
  return <div><h1 style={{ fontSize: 20 }}>판매사 푸시 알림</h1><PushTokenForm action={updateVendorPushAction} initial={initial} config={config} /></div>;
}
