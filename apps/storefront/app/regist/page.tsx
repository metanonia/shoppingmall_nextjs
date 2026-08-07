import { getMemberFormConfig } from "@shoppingmall/core";
import { RegistForm } from "@/components/RegistForm";

export default async function RegistPage() {
  const config = await getMemberFormConfig();
  return <RegistForm config={config} />;
}
