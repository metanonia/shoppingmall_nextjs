import { describe, expect, it } from "vitest";
import { calcCouponDiscount } from "./coupon";

describe("calcCouponDiscount", () => {
  it("caps a flat-won (W) discount at the order price", () => {
    expect(calcCouponDiscount(5000, 3000, "W", 0)).toBe(3000);
    expect(calcCouponDiscount(2000, 3000, "W", 0)).toBe(2000); // can't discount more than the price itself
  });

  it("computes a percent (P) discount with no cap", () => {
    expect(calcCouponDiscount(10000, 10, "P", 0)).toBe(1000);
  });

  it("caps a percent discount at discount_limit when set", () => {
    expect(calcCouponDiscount(100000, 10, "P", 5000)).toBe(5000); // 10% would be 10000, capped to 5000
  });

  it("never returns more than the price even with a percent discount over 100%", () => {
    expect(calcCouponDiscount(1000, 150, "P", 0)).toBe(1000);
  });
});
