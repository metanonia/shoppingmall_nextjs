import { getAdminPushToken, getFirebaseWebConfig } from "@shoppingmall/core";
import { requireAdmin } from "@/lib/auth";
import { PushTokenForm } from "@/components/PushTokenForm";
import { updateAdminPushAction, updateFirebaseWebConfigAction } from "./actions";

export default async function AdminPushPage() {
  const session = await requireAdmin();
  const [initial, config] = await Promise.all([getAdminPushToken(session.userId), getFirebaseWebConfig()]);
  const fields = [
    ["apiKey", config.apiKey], ["authDomain", config.authDomain], ["projectId", config.projectId],
    ["storageBucket", config.storageBucket], ["messagingSenderId", config.messagingSenderId],
    ["appId", config.appId], ["vapidKey", config.vapidKey],
  ];
  return <div><h1 style={{ fontSize: 20 }}>관리자 푸시 알림</h1><PushTokenForm action={updateAdminPushAction} initial={initial} config={config} /><h2 style={{ fontSize: 17, marginTop: 32 }}>Firebase 웹 설정</h2><p style={{ color: "#777", margin: "8px 0 12px" }}>Firebase 웹 앱의 공개 설정과 Web Push 인증서(VAPID 공개키)를 입력합니다. 서버 발송용 서비스 계정은 FCM_SERVICE_ACCOUNT_JSON 환경변수로 별도 관리합니다.</p><form action={updateFirebaseWebConfigAction} style={{ display: "grid", gap: 8, maxWidth: 680 }}>{fields.map(([name, value]) => <label key={name} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 8 }}>{name}<input name={name} defaultValue={value} required /></label>)}<button style={{ justifySelf: "start" }}>Firebase 설정 저장</button></form></div>;
}
