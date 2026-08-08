import { autoMailLabel, getAutoMailTemplates } from "@shoppingmall/core";
import { AutoMailTemplateForm } from "@/components/AutoMailTemplateForm";

export default async function MailTemplatesPage() {
  const templates = await getAutoMailTemplates();

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>자동메일 템플릿 관리</h1>
      {templates.map((item) => (
        <AutoMailTemplateForm key={item.type} item={item} label={autoMailLabel(item.type)} />
      ))}
    </div>
  );
}
