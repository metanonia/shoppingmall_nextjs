"use client";

import { useState } from "react";
import type { DashboardWidgetKey, WidgetLayoutItem } from "@shoppingmall/core";
import { updateWidgetLayoutAction } from "@/app/(protected)/actions";

// Up/down-button reordering, not drag-and-drop — same established
// precedent as DisplayReorderForm (goods-display) for this repo's admin
// list-reordering screens.
export function WidgetLayoutForm({ layout, labels }: { layout: WidgetLayoutItem[]; labels: Record<DashboardWidgetKey, string> }) {
  const [items, setItems] = useState(layout);

  function move(index: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function toggleVisible(index: number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, visible: !item.visible } : item)));
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>위젯 배치</h2>
      <form action={updateWidgetLayoutAction} style={{ maxWidth: 400 }}>
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>표시</th>
              <th>위젯</th>
              <th>순서</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.key}>
                <td>
                  <input type="checkbox" name={`visible_${item.key}`} checked={item.visible} onChange={() => toggleVisible(i)} />
                </td>
                <td>{labels[item.key]}</td>
                <td>
                  <input type="hidden" name="order" value={item.key} />
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0}>
                    ↑
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1}>
                    ↓
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="submit" style={{ marginTop: 12 }}>
          저장
        </button>
      </form>
    </div>
  );
}
