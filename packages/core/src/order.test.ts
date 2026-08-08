import { describe, expect, it } from "vitest";
import { calcMileageRefundSplit } from "./order";

describe("calcMileageRefundSplit", () => {
  it("restores nothing when the net amount is zero or negative", () => {
    expect(calcMileageRefundSplit(5000, 1000, 1000)).toEqual({ restore: 0, bonus: 0, remainingUseMileage: 5000 });
    expect(calcMileageRefundSplit(5000, 500, 1000)).toEqual({ restore: 0, bonus: 0, remainingUseMileage: 5000 });
  });

  it("restores the net amount and shrinks use_mileage when it fits within the original usage", () => {
    expect(calcMileageRefundSplit(5000, 2000, 500)).toEqual({ restore: 1500, bonus: 0, remainingUseMileage: 3500 });
  });

  it("restores the full original usage and grants the remainder as a new bonus when net exceeds it", () => {
    expect(calcMileageRefundSplit(1000, 5000, 500)).toEqual({ restore: 1000, bonus: 3500, remainingUseMileage: 0 });
  });

  it("restores exactly the original usage with no bonus when net equals it", () => {
    expect(calcMileageRefundSplit(1500, 2000, 500)).toEqual({ restore: 1500, bonus: 0, remainingUseMileage: 0 });
  });
});
