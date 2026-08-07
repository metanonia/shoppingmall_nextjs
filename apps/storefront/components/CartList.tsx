"use client";

import { useRef } from "react";
import type { CartLine } from "@shoppingmall/core";
import { removeCartItemAction, toggleCartSelectAction, updateCartQtyAction } from "@/app/cart/actions";

function formatWon(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// Port of php/cart.php's item list. Legacy renders a plain HTML table and
// wires jQuery handlers to AJAX endpoints for select/qty/remove; this uses
// one <form> per control with auto-submit on change, calling the server
// actions directly instead of a JSON API layer.
export function CartList({ lines }: { lines: CartLine[] }) {
  const formRefs = useRef<Record<number, HTMLFormElement | null>>({});

  if (lines.length === 0) {
    return <div className="emptyList">장바구니에 담긴 상품이 없습니다.</div>;
  }

  return (
    <table style={{ width: "100%" }}>
      <thead>
        <tr>
          <th />
          <th>상품정보</th>
          <th>수량</th>
          <th>금액</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <tr key={line.cartUid} style={line.soldOut ? { opacity: 0.5 } : undefined}>
            <td>
              <form action={toggleCartSelectAction} ref={(el) => { formRefs.current[line.cartUid] = el; }}>
                <input type="hidden" name="cartUid" value={line.cartUid} />
                <input
                  type="hidden"
                  name="selected"
                  value={line.selected ? "0" : "1"}
                />
                <input
                  type="checkbox"
                  defaultChecked={line.selected}
                  disabled={line.soldOut}
                  onChange={(e) => e.currentTarget.form?.requestSubmit()}
                />
              </form>
            </td>
            <td>
              <img src={line.image} alt={line.goodsName} width={60} />
              <div>
                <a href={`/goods/${line.goodsUid}`}>{line.goodsName}</a>
                {line.optionValue && <div className="size12 colorGray">옵션: {line.optionValue}</div>}
                {line.requiresOptionMissing && <div className="colorRed">옵션을 다시 선택해주세요.</div>}
                {line.soldOut && <div className="colorRed">품절되었거나 판매가 중지된 상품입니다.</div>}
              </div>
            </td>
            <td>
              <form action={updateCartQtyAction}>
                <input type="hidden" name="cartUid" value={line.cartUid} />
                <input
                  type="number"
                  name="qty"
                  min={1}
                  max={line.availableQty ?? undefined}
                  defaultValue={line.qty}
                  disabled={line.soldOut}
                  style={{ width: 50 }}
                  onBlur={(e) => e.currentTarget.form?.requestSubmit()}
                />
              </form>
            </td>
            <td>{formatWon(line.lineTotal)}원</td>
            <td>
              <form action={removeCartItemAction}>
                <input type="hidden" name="cartUid" value={line.cartUid} />
                <button type="submit">삭제</button>
              </form>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
