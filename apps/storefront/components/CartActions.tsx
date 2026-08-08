"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { OptionCombination, OptionGroup } from "@shoppingmall/core";
import { addToCartAction, type AddToCartFormState } from "@/app/cart/actions";

// Replaces ProductDetail.tsx's no-op BuyButtons() now that the cart engine
// (Phase 4) exists. Legacy's mobile view puts this behind a sticky bottom
// drawer (#btnFixOrder) — not reproduced, same simplification the rest of
// ProductDetail already makes.
export function CartActions({
  goodsUid,
  optionUse,
  options,
  optionCombinations,
}: {
  goodsUid: number;
  optionUse: boolean;
  options: OptionGroup[];
  optionCombinations: OptionCombination[];
}) {
  const router = useRouter();
  const isMultiDimension = options.length > 1;
  const needsOptionPicker = optionUse && options.some((g) => g.values.length > 0);

  // Single-dimension: OptionValue.uid already IS the option row uid, so
  // selection just tracks that uid directly (unchanged from before). Multi-
  // dimension: each dimension only has a *value* (e.g. "화이트"), not a row
  // uid — the real combination row is resolved below via optionCombinations.
  const [singleOptionUid, setSingleOptionUid] = useState<number | null>(null);
  const [selection, setSelection] = useState<(string | null)[]>(() => options.map(() => null));

  const selectedCombination = useMemo(() => {
    if (!isMultiDimension) return null;
    if (selection.some((v) => v === null)) return null;
    return optionCombinations.find((c) => c.parts.every((part, i) => part === selection[i])) ?? null;
  }, [isMultiDimension, selection, optionCombinations]);

  const optionUid = isMultiDimension ? (selectedCombination?.uid ?? null) : singleOptionUid;

  const [qty, setQty] = useState(1);
  const [direct, setDirect] = useState(false);
  const [state, formAction, pending] = useActionState<AddToCartFormState, FormData>(addToCartAction, {});

  useEffect(() => {
    if (state.success && direct) router.push("/order?direct=1");
  }, [state.success, direct, router]);

  const comboSoldOut = isMultiDimension && selectedCombination?.soldOut === true;
  const disabled = (needsOptionPicker && optionUid === null) || comboSoldOut || pending;

  return (
    <div>
      {needsOptionPicker &&
        options.map((group, dimIndex) => (
          <div key={group.name} className="option_select">
            <div className="size12 colorGray">{group.name}</div>
            {group.values.map((v) => {
              const selected = isMultiDimension ? selection[dimIndex] === v.value : singleOptionUid === v.uid;
              return (
                <div
                  key={v.value}
                  className={selected ? "option_value selected" : "option_value"}
                  onClick={() => {
                    if (isMultiDimension) {
                      setSelection((prev) => prev.map((val, i) => (i === dimIndex ? v.value : val)));
                    } else {
                      setSingleOptionUid(v.uid);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {v.value} {v.priceLabel}
                </div>
              );
            })}
          </div>
        ))}
      {isMultiDimension && selectedCombination?.priceLabel && (
        <div className="size12 colorGray">{selectedCombination.priceLabel}</div>
      )}
      {comboSoldOut && <div className="colorRed size12">선택하신 옵션은 품절되었습니다.</div>}

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
