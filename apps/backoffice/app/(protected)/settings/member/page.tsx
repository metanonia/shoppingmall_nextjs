import { getMemberFormConfig, getSocialConfigs } from "@shoppingmall/core";
import { MemberConfigForm } from "@/components/SettingsForms";

export default async function MemberSettingsPage() {
  const [config, socialConfigs] = await Promise.all([getMemberFormConfig(), getSocialConfigs()]);
  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>회원정책 설정</h1>
      <MemberConfigForm config={config} socialConfigs={socialConfigs} />
    </div>
  );
}
