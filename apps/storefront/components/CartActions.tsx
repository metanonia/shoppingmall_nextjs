"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { OptionGroup } from "@shoppingmall/core";
import { addToCartAction, type AddToCartFormState } from "@/app/cart/actions";

// Replaces ProductDetail.tsx's no-op BuyButtons() now that the cart engine
// (Phase 4) exists. Legacy's mobile view puts this behind a sticky bottom
// drawer (#btnFixOrder) — not reproduced, same simplification the rest of
// ProductDetail already makes.
export function CartActions({
  goodsUid,
  optionUse,
  options,
}: {
  goodsUid: number;
  optionUse: boolean;
  options: OptionGroup[];
}) {
  const router = useRouter();
  const singleDimension = optionUse ? options[0] : null;
  const needsOptionPicker = optionUse && (singleDimension?.values.length ?? 0) > 0;
  const comboOptionUnsupported = optionUse && !needsOptionPicker;

  const [optionUid, setOptionUid] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [direct, setDirect] = useState(false);
  const [state, formAction, pending] = useActionState<AddToCartFormState, FormData>(addToCartAction, {});

  useEffect(() => {
    if (state.success && direct) router.push("/order?direct=1");
  }, [state.success, direct, router]);

  const disabled = comboOptionUnsupported || (needsOptionPicker && optionUid === null) || pending;

  return (
    <div>
      {needsOptionPicker && singleDimension && (
        <div className="option_select">
          {singleDimension.values.map((v) => (
            <div
              key={v.uid}
              className={optionUid === v.uid ? "option_value selected" : "option_value"}
              onClick={() => setOptionUid(v.uid)}
              style={{ cursor: "pointer" }}
            >
              {v.value} {v.priceLabel}
            </div>
          ))}
        </div>
      )}
      {comboOptionUnsupported && <div className="colorRed size12">옵션 조합 선택은 준비 중입니다.</div>}

      <input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
        style={{ width: 60 }}
      />

      {state.error && <div className="colorRed size12">{state.error}</div>}

      <form action={formAction}>
        <input type="hidden" name="goodsUid" value={goodsUid} />
        <input type="hidden" name="optionUid" value={optionUid ?? 0} />
        <input type="hidden" name="qty" value={qty} />
        <input type="hidden" name="direct" value="0" />
        <button
          className="shineButton btnCart"
          style={{ width: 200 }}
          type="submit"
          disabled={disabled}
          onClick={() => setDirect(false)}
        >
          장바구니
        </button>
      </form>
      <form action={formAction}>
        <input type="hidden" name="goodsUid" value={goodsUid} />
        <input type="hidden" name="optionUid" value={optionUid ?? 0} />
        <input type="hidden" name="qty" value={qty} />
        <input type="hidden" name="direct" value="1" />
        <button
          className="shineButtonBlack btnOrder"
          style={{ width: 226, marginLeft: 6 }}
          type="submit"
          disabled={disabled}
          onClick={() => setDirect(true)}
        >
          바로구매
        </button>
      </form>
    </div>
  );
}
