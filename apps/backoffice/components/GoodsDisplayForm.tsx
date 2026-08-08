"use client";

import { useActionState, useState } from "react";
import type { AdminGoodsListItem, DisplayGoodsItem } from "@shoppingmall/core";
import {
  addGoodsToDisplayAction as defaultAddGoodsToDisplayAction,
  removeGoodsFromDisplayAction as defaultRemoveGoodsFromDisplayAction,
  reorderDisplayGoodsAction as defaultReorderDisplayGoodsAction,
  type ActionState,
} from "@/app/(protected)/goods/display/actions";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// Up/down-button reordering instead of drag-and-drop — matches this repo's
// established precedent (Phase 7's order_priority, Phase 8's vendor display
// sequence) of substituting legacy's AJAX drag-drop with a simpler explicit
// control rather than pulling in a DnD library for one screen.
export function DisplayReorderForm({
  slot,
  sub,
  cate,
  items,
  actions,
}: {
  slot: string;
  sub: number;
  cate?: string;
  items: DisplayGoodsItem[];
  actions?: {
    removeGoodsFromDisplay: (formData: FormData) => Promise<void>;
    reorderDisplayGoods: (formData: FormData) => Promise<void>;
  };
}) {
  const removeGoodsFromDisplayAction = actions?.removeGoodsFromDisplay ?? defaultRemoveGoodsFromDisplayAction;
  const reorderDisplayGoodsAction = actions?.reorderDisplayGoods ?? defaultReorderDisplayGoodsAction;
  const [order, setOrder] = useState(items.map((i) => i.uid));
  const byUid = new Map(items.map((i) => [i.uid, i]));

  function move(index: number, dir: -1 | 1) {
    setOrder((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  if (items.length === 0) return <div style={{ color: "#999" }}>진열된 상품이 없습니다.</div>;

  return (
    <div>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>순서</th>
            <th>상품명</th>
            <th>가격</th>
            <th>이동</th>
            <th>제외</th>
          </tr>
        </thead>
        <tbody>
          {order.map((uid, i) => {
            const item = byUid.get(uid);
            if (!item) return null;
            return (
              <tr key={uid}>
                <td>{i + 1}</td>
                <td>{item.name}</td>
                <td>{formatWon(item.price)}원</td>
                <td>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0}>
                    ↑
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1}>
                    ↓
                  </button>
                </td>
                <td>
                  <form action={removeGoodsFromDisplayAction}>
                    <input type="hidden" name="slot" value={slot} />
                    <input type="hidden" name="sub" value={sub} />
                    <input type="hidden" name="goodsUid" value={uid} />
                    <button type="submit">제외</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <form action={reorderDisplayGoodsAction} style={{ marginTop: 8 }}>
        <input type="hidden" name="slot" value={slot} />
        <input type="hidden" name="sub" value={sub} />
        {cate && <input type="hidden" name="cate" value={cate} />}
        {order.map((uid) => (
          <input key={uid} type="hidden" name="uid" value={uid} />
        ))}
        <button type="submit">순서 저장</button>
      </form>
    </div>
  );
}

export function DisplaySearchForm({
  slot,
  sub,
  keyword,
  results,
  actions,
}: {
  slot: string;
  sub: number;
  keyword?: string;
  results: AdminGoodsListItem[];
  actions?: {
    addGoodsToDisplay: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  };
}) {
  const addGoodsToDisplayAction = actions?.addGoodsToDisplay ?? defaultAddGoodsToDisplayAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addGoodsToDisplayAction, {});

  return (
    <div>
      <form method="get" style={{ marginBottom: 12 }}>
        <input type="hidden" name="slot" value={slot} />
        <input type="hidden" name="sub" value={sub} />
        <input type="text" name="keyword" placeholder="상품명 검색" defaultValue={keyword} />
        <button type="submit">검색</button>
      </form>
      {state.error && <div style={{ color: "#e02020" }}>{state.error}</div>}
      {results.length > 0 && (
        <table style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>상품명</th>
              <th>가격</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map((g) => (
              <tr key={g.uid}>
                <td>{g.name}</td>
                <td>{formatWon(g.price)}원</td>
                <td>
                  <form action={formAction}>
                    <input type="hidden" name="slot" value={slot} />
                    <input type="hidden" name="sub" value={sub} />
                    <input type="hidden" name="goodsUid" value={g.uid} />
                    <button type="submit" disabled={pending}>
                      추가
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
