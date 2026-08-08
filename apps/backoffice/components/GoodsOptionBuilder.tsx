"use client";

import { useActionState } from "react";
import type { AdminGoodsOptionRow } from "@shoppingmall/core";
import {
  createGoodsOptionsAction,
  deleteGoodsOptionAction,
  updateGoodsOptionAction,
  type OptionActionState,
} from "@/app/(protected)/goods/actions";

type OptionActions = {
  create: (prevState: OptionActionState, formData: FormData) => Promise<OptionActionState>;
  update: (prevState: OptionActionState, formData: FormData) => Promise<OptionActionState>;
  delete: (formData: FormData) => Promise<void>;
};

const DEFAULT_ACTIONS: OptionActions = { create: createGoodsOptionsAction, update: updateGoodsOptionAction, delete: deleteGoodsOptionAction };

// Shared by admin (/goods) and vendor (/vendor/goods) — vendor pages pass
// their own vendor-scoped actions (ownership-checked server-side) instead
// of the admin defaults.
export function GoodsOptionBuilder({ guid, options, actions = DEFAULT_ACTIONS, optionNames = [] }: { guid: number; options: AdminGoodsOptionRow[]; actions?: OptionActions; optionNames?: string[] }) {
  const [state, formAction, pending] = useActionState<OptionActionState, FormData>(actions.create, {});

  return (
    <div>
      <h3 style={{ fontSize: 16 }}>옵션 빌더</h3>
      <p style={{ fontSize: 12, color: "#999" }}>
        옵션명과 값을 입력하고 생성하면, 기존 옵션 품목이 전부 새 조합으로 교체됩니다(레거시 &quot;옵션품목 만들기&quot;와 동일).
      </p>
      <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 500 }}>
        <input type="hidden" name="guid" value={guid} />
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", gap: 6 }}>
            <input type="text" name={`dimName${i}`} placeholder={`옵션명 ${i + 1} (예: 색상)`} list="goods-option-names" style={{ width: 140 }} />
            <input type="text" name={`dimValues${i}`} placeholder="값(쉼표로 구분, 예: 화이트,블랙)" style={{ flex: 1 }} />
          </div>
        ))}
        <datalist id="goods-option-names">{optionNames.map((name) => <option key={name} value={name} />)}</datalist>
        {state.error && <div style={{ color: "#e02020", fontSize: 12 }}>{state.error}</div>}
        <button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
          옵션품목 만들기
        </button>
      </form>

      {options.length > 0 && (
        <table style={{ width: "100%", marginTop: 16 }}>
          <thead>
            <tr>
              <th>옵션값</th>
              <th>추가금액</th>
              <th>재고</th>
              <th>품목코드</th>
              <th>사용</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {options.map((o) => (
              <OptionRow key={o.uid} guid={guid} option={o} actions={actions} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function OptionRow({ guid, option, actions }: { guid: number; option: AdminGoodsOptionRow; actions: OptionActions }) {
  const [state, formAction, pending] = useActionState<OptionActionState, FormData>(actions.update, {});

  return (
    <tr>
      <td colSpan={6}>
        <form action={formAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="hidden" name="uid" value={option.uid} />
          <input type="hidden" name="guid" value={guid} />
          <span style={{ width: 140 }}>{option.value}</span>
          <input type="number" name="price" defaultValue={option.price} style={{ width: 90 }} />
          <input type="number" name="qty" defaultValue={option.qty} style={{ width: 80 }} />
          <label>
            <input type="checkbox" name="qtyTypeInfinite" defaultChecked={option.qtyType === 1} /> 무제한
          </label>
          <input type="text" name="code" defaultValue={option.code} style={{ width: 100 }} />
          <label>
            <input type="checkbox" name="used" defaultChecked={option.used} /> 사용
          </label>
          <button type="submit" disabled={pending}>
            저장
          </button>
          {state.error && <span style={{ color: "#e02020", fontSize: 12 }}>{state.error}</span>}
        </form>
        <form action={actions.delete} style={{ display: "inline" }}>
          <input type="hidden" name="uid" value={option.uid} />
          <input type="hidden" name="guid" value={guid} />
          <button type="submit">삭제</button>
        </form>
      </td>
    </tr>
  );
}
