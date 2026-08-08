import { describe, expect, it } from "vitest";
import { getDeliveryFee } from "./cart";

const CONFIG_CONDITIONAL_FREE = {
  deliveryType: "P" as const, // anything other than "F"/"D" — conditional-free-over-threshold
  deliveryDPrice: 0,
  deliveryPType: "order",
  deliveryPPrice1: 30000, // free over 30,000
  deliveryPPrice2: 3000,
};

describe("getDeliveryFee", () => {
  it("charges nothing for a free-delivery (type 2) item", () => {
    const { total } = getDeliveryFee(
      [{ vendorDelivery: "v1", deliveryType: 2, deliveryPrice: 0, lineTotal: 10000 }],
      CONFIG_CONDITIONAL_FREE,
    );
    expect(total).toBe(0);
  });

  it("charges nothing for COD (type 3) — collected on delivery, not prepaid", () => {
    const { total } = getDeliveryFee(
      [{ vendorDelivery: "v1", deliveryType: 3, deliveryPrice: 2500, lineTotal: 10000 }],
      CONFIG_CONDITIONAL_FREE,
    );
    expect(total).toBe(0);
  });

  it("charges the fixed fee once per vendor group for type 4, even with multiple lines", () => {
    const { total, perVendor } = getDeliveryFee(
      [
        { vendorDelivery: "v1", deliveryType: 4, deliveryPrice: 4000, lineTotal: 5000 },
        { vendorDelivery: "v1", deliveryType: 4, deliveryPrice: 4000, lineTotal: 5000 },
      ],
      CONFIG_CONDITIONAL_FREE,
    );
    expect(total).toBe(4000); // not 8000 — dedupe within the vendor group
    expect(perVendor.get("v1")).toBe(4000);
  });

  it("charges per item for type 5", () => {
    const { total } = getDeliveryFee(
      [
        { vendorDelivery: "v1", deliveryType: 5, deliveryPrice: 1000, lineTotal: 5000 },
        { vendorDelivery: "v1", deliveryType: 5, deliveryPrice: 1000, lineTotal: 5000 },
      ],
      CONFIG_CONDITIONAL_FREE,
    );
    expect(total).toBe(2000);
  });

  it("applies the shop-wide conditional-free policy for type 1 (default)", () => {
    const belowThreshold = getDeliveryFee(
      [{ vendorDelivery: "v1", deliveryType: 1, deliveryPrice: 0, lineTotal: 10000 }],
      CONFIG_CONDITIONAL_FREE,
    );
    expect(belowThreshold.total).toBe(3000);

    const aboveThreshold = getDeliveryFee(
      [{ vendorDelivery: "v1", deliveryType: 1, deliveryPrice: 0, lineTotal: 40000 }],
      CONFIG_CONDITIONAL_FREE,
    );
    expect(aboveThreshold.total).toBe(0);
  });

  it("keeps separate vendor groups independent", () => {
    const { total, perVendor } = getDeliveryFee(
      [
        { vendorDelivery: "v1", deliveryType: 2, deliveryPrice: 0, lineTotal: 5000 },
        { vendorDelivery: "v2", deliveryType: 5, deliveryPrice: 2500, lineTotal: 5000 },
      ],
      CONFIG_CONDITIONAL_FREE,
    );
    expect(perVendor.get("v1")).toBe(0);
    expect(perVendor.get("v2")).toBe(2500);
    expect(total).toBe(2500);
  });

  it("uses each seller's delivery policy for seller-shipped default items", () => {
    const vendorConfigs = new Map([
      ["v1", { deliveryType: "F" as const, deliveryDPrice: 0, deliveryPType: "order", deliveryPPrice1: 0, deliveryPPrice2: 0 }],
      ["v2", { deliveryType: "P" as const, deliveryDPrice: 0, deliveryPType: "order", deliveryPPrice1: 50000, deliveryPPrice2: 5000 }],
    ]);
    const { total, perVendor } = getDeliveryFee([
      { vendorDelivery: "v1", deliveryType: 1, deliveryPrice: 0, lineTotal: 10000 },
      { vendorDelivery: "v2", deliveryType: 1, deliveryPrice: 0, lineTotal: 10000 },
    ], CONFIG_CONDITIONAL_FREE, vendorConfigs);
    expect(perVendor.get("v1")).toBe(0);
    expect(perVendor.get("v2")).toBe(5000);
    expect(total).toBe(5000);
  });
});
