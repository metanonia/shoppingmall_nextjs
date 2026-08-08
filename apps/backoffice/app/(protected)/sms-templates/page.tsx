import { getSmsAutoTemplates } from "@shoppingmall/core";
import { updateSmsAutoTemplateAction } from "./actions";

export default async function SmsTemplatesPage() {
  const templates = await getSmsAutoTemplates();
  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>문자 알림설정</h1>
      {templates.map((item) => (
        <form key={item.uid} action={updateSmsAutoTemplateAction} style={{ border: "1px solid #ddd", padding: 16, marginBottom: 16, display: "grid", gap: 8 }}>
          <input type="hidden" name="uid" value={item.uid} />
          <strong>{item.title} ({item.code})</strong>
          {item.type !== 2 && <><label><input type="checkbox" name="customerEnabled" defaultChecked={item.customerEnabled} /> 고객/수신자 자동발송</label><textarea name="message1" defaultValue={item.message1} rows={4} /></>}
          {item.type !== 1 && <><label><input type="checkbox" name="adminEnabled" defaultChecked={item.adminEnabled} /> 관리자 자동발송</label><textarea name="message2" defaultValue={item.message2} rows={4} /></>}
          <button type="submit" style={{ width: 100 }}>저장</button>
        </form>
      ))}
    </div>
  );
}
