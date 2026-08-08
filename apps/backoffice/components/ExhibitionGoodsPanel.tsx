"use client";

import { useActionState } from "react";
import type { AdminExhibitionGoodsItem } from "@shoppingmall/core";
import { addExhibitionGoodsAction, removeExhibitionGoodsAction, type ActionState } from "@/app/(protected)/exhibitions/actions";

export function ExhibitionGoodsPanel({ euid, goods }: { euid: number; goods: AdminExhibitionGoodsItem[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addExhibitionGoodsAction, {});

  return (
    <div>
      <h3 style={{ fontSize: 16 }}>기획전 상품</h3>
      <form action={formAction} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input type="hidden" name="euid" value={euid} />
        <input type="number" name="goodsUid" placeholder="상품 uid" required />
        <button type="submit" disabled={pending}>
          추가
        </button>
        {state.error && <span style={{ color: "#e02020", fontSize: 12 }}>{state.error}</span>}
      </form>
      <table style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>순서</th>
            <th>상품명</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {goods.map((g) => (
            <tr key={g.uid}>
              <td>{g.sequence}</td>
              <td>{g.goodsName}</td>
              <td>
                <form action={removeExhibitionGoodsAction}>
                  <input type="hidden" name="uid" value={g.uid} />
                  <input type="hidden" name="euid" value={euid} />
                  <button type="submit">제거</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
