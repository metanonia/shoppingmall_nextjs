import { describe, expect, it } from "vitest";
import { getGoodsPrice, priceLimit } from "./pricing";

const NO_ROUNDING = { goodsPriceLimit1: 0, goodsPriceLimit2: 0 };
const ROUND_TO_100 = { goodsPriceLimit1: 10, goodsPriceLimit2: 2 }; // unit = 10*10 = 100, round

describe("priceLimit", () => {
  it("returns the price unchanged when rounding is disabled", () => {
    expect(priceLimit(12345, NO_ROUNDING)).toBe(12345);
  });

  it("floors to the configured unit (type 1)", () => {
    expect(priceLimit(1249, { goodsPriceLimit1: 10, goodsPriceLimit2: 1 })).toBe(1200);
  });

  it("rounds to the configured unit (type 2)", () => {
    expect(priceLimit(1250, ROUND_TO_100)).toBe(1300);
    expect(priceLimit(1240, ROUND_TO_100)).toBe(1200);
  });

  it("ceils to the configured unit (type 3)", () => {
    expect(priceLimit(1201, { goodsPriceLimit1: 10, goodsPriceLimit2: 3 })).toBe(1300);
  });
});

describe("getGoodsPrice", () => {
  const eventDiscounts = new Map([[1, 10]]); // exhibition uid 1 -> 10% off

  it("applies no discount when goods isn't in an active exhibition and has no member discount", () => {
    const result = getGoodsPrice(10000, ",2,", eventDiscounts, NO_ROUNDING);
    expect(result).toEqual({ price: 10000, eventDiscountPct: 0, memberDiscountPct: 0, saleAmount: 0 });
  });

  it("applies the event discount when the goods' exhibition field matches", () => {
    const result = getGoodsPrice(10000, ",1,", eventDiscounts, NO_ROUNDING);
    expect(result.price).toBe(9000);
    expect(result.eventDiscountPct).toBe(10);
    expect(result.saleAmount).toBe(1000);
  });

  it("applies the member discount against the original price, not the event-discounted price", () => {
    // 10% event + 10% member on a 10000 base should each independently take
    // 1000 off the ORIGINAL price (legacy lib.Shop.php:281-283), landing at
    // 8000 — not 8100 (which double-compounding would produce).
    const result = getGoodsPrice(10000, ",1,", eventDiscounts, NO_ROUNDING, 10);
    expect(result.price).toBe(8000);
    expect(result.saleAmount).toBe(2000);
  });

  it("uses price_ment-free numeric path even when exhibition field is empty", () => {
    const result = getGoodsPrice(5000, "", eventDiscounts, NO_ROUNDING, 5);
    expect(result.price).toBe(4750);
    expect(result.memberDiscountPct).toBe(5);
  });
});
