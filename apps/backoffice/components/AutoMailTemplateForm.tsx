"use client";

import { useActionState } from "react";
import type { AutoMailTemplateItem } from "@shoppingmall/core";
import { updateAutoMailTemplateAction, type ActionState } from "@/app/(protected)/mail-templates/actions";

const TOKEN_HINTS: Record<string, string[]> = {
  order_received: ["SHOPNAME", "ORDERNUM", "GOODS_TABLE", "PAYTOTAL"],
  order_paid: ["SHOPNAME", "ORDERNUM", "GOODS_TABLE", "PAYTOTAL"],
  passwd: ["SHOPNAME", "AUTHCODE"],
  sleep: ["SHOPNAME", "NAME", "DAYS"],
};

export function AutoMailTemplateForm({ item, label }: { item: AutoMailTemplateItem; label: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateAutoMailTemplateAction, {});

  return (
    <fieldset style={{ border: "1px solid #eee", padding: 16, borderRadius: 8, marginBottom: 16 }}>
      <legend>{label}</legend>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 640 }}>
        <input type="hidden" name="type" value={item.type} />
        <label>
          <input type="checkbox" name="used" defaultChecked={item.used} /> 아래 커스텀 내용 사용(체크 해제 시 기본 템플릿 사용)
        </label>
        <div style={{ fontSize: 12, color: "#999" }}>
          사용 가능한 토큰: {TOKEN_HINTS[item.type]?.map((t) => `{${t}}`).join(", ")}
        </div>
        <input type="text" name="subject" placeholder="메일 제목" defaultValue={item.subject} />
        <textarea name="content" placeholder="메일 본문 HTML" defaultValue={item.content} rows={8} style={{ width: "100%", fontFamily: "monospace" }} />
        {state.error && <div style={{ color: "#e02020" }}>{state.error}</div>}
        {state.success && <div style={{ color: "#2a8f2a" }}>저장되었습니다.</div>}
        <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
          저장
        </button>
      </form>
    </fieldset>
  );
}
