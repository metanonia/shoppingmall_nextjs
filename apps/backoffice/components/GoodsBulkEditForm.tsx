"use client";

import { useActionState, useState } from "react";
import type { GoodsBulkEditItem } from "@shoppingmall/core";
import {
  bulkUpdateGoodsPricingAction,
  bulkUpdateOrderPriorityAction,
  type ActionState,
} from "@/app/(protected)/goods/bulk-edit/actions";

type BulkEditActions = {
  updatePricing: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  updatePriority: (formData: FormData) => Promise<void>;
};

const DEFAULT_ACTIONS: BulkEditActions = { updatePricing: bulkUpdateGoodsPricingAction, updatePriority: bulkUpdateOrderPriorityAction };

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// Shared by admin (/goods/bulk-edit) and vendor (/vendor/goods/bulk-edit) —
// same actions-prop pattern Phase 8 established for GoodsForm/
// GoodsOptionBuilder.
export function GoodsBulkEditForm({ items, actions = DEFAULT_ACTIONS }: { items: GoodsBulkEditItem[]; actions?: BulkEditActions }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(actions.updatePricing, {});
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [priority, setPriority] = useState(5);

  function toggle(uid: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  if (items.length === 0) return <div style={{ color: "#999" }}>상품이 없습니다.</div>;

  return (
    <div>
      <form action={formAction}>
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th></th>
              <th>상품명</th>
              <th>판매가</th>
              <th>매입가</th>
              <th>소비자가</th>
              <th>수수료</th>
              <th>재고</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.uid}>
                <input type="hidden" name="uid" value={item.uid} />
                <td>
                  <input type="checkbox" checked={checked.has(item.uid)} onChange={() => toggle(item.uid)} />
                </td>
                <td>{item.name}</td>
                <td>
                  <input type="number" name={`price_${item.uid}`} defaultValue={item.price} style={{ width: 90 }} />
                </td>
                <td>
                  <input type="number" name={`origPrice_${item.uid}`} defaultValue={item.origPrice} style={{ width: 90 }} />
                </td>
                <td>
                  <input type="number" name={`consumerPrice_${item.uid}`} defaultValue={item.consumerPrice} style={{ width: 90 }} />
                </td>
                <td>
                  <select name={`commissionType_${item.uid}`} defaultValue={item.commissionType} style={{ marginRight: 4 }}>
                    <option value={0}>기본요율</option>
                    <option value={1}>개별지정</option>
                  </select>
                  <input type="number" name={`commission_${item.uid}`} defaultValue={item.commission} style={{ width: 60 }} />%
                </td>
                <td>
                  {item.optionUse ? (
                    <span style={{ color: "#999" }}>옵션별 관리</span>
                  ) : (
                    <>
                      <input type="number" name={`qty_${item.uid}`} defaultValue={item.qty} style={{ width: 70 }} />
                      <label style={{ marginLeft: 4, fontSize: 12 }}>
                        <input type="checkbox" name={`qtyType_${item.uid}`} value="1" defaultChecked={item.qtyType === 1} /> 무제한
                      </label>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {state.error && <div style={{ color: "#e02020" }}>{state.error}</div>}
        {state.success && <div style={{ color: "#2a8" }}>저장되었습니다.</div>}
        <button type="submit" disabled={pending} style={{ marginTop: 8 }}>
          {pending ? "저장 중..." : "전체저장"}
        </button>
      </form>

      <div className="empty20" />
      <form action={actions.updatePriority} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {Array.from(checked).map((uid) => (
          <input key={uid} type="hidden" name="uid" value={uid} />
        ))}
        <span>선택한 {checked.size}개 상품의 진열순서를</span>
        <select value={priority} onChange={(e) => setPriority(Number(e.target.value))} name="priority">
          {Array.from({ length: 10 }, (_, i) => i).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span>(으)로 일괄변경</span>
        <button type="submit" disabled={checked.size === 0}>
          적용
        </button>
      </form>
    </div>
  );
}
