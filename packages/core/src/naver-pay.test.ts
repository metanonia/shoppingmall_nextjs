import { describe, expect, it } from "vitest";
import type { ShopConfig } from "./config";
import { getNaverPayShipping, naverPayReady } from "./naver-pay";

const config = {
  naverPayUsed: true,
  naverPayShopId: "shop",
  naverPayCertKey: "secret",
  deliveryType: "P",
  deliveryPPrice1: 50_000,
  deliveryPPrice2: 3_000,
} as unknown as ShopConfig;

describe("네이버페이 계약 어댑터", () => {
  it("사용 설정과 계약키가 모두 있어야 활성화한다", () => {
    expect(naverPayReady(config)).toBe(true);
    expect(naverPayReady({ ...config, naverPayCertKey: "" })).toBe(false);
  });

  it("조건부 배송비를 계산한다", () => {
    expect(getNaverPayShipping({ deliveryType: 1, deliveryPrice: 0, count: 1, totalPrice: 40_000 }, config)).toEqual({ type: "PAYED", price: 3_000 });
    expect(getNaverPayShipping({ deliveryType: 1, deliveryPrice: 0, count: 1, totalPrice: 60_000 }, config)).toEqual({ type: "FREE", price: 0 });
  });

  it("개당 배송비를 수량만큼 반영한다", () => {
    expect(getNaverPayShipping({ deliveryType: 5, deliveryPrice: 2_000, count: 3, totalPrice: 30_000 }, config)).toEqual({ type: "PAYED", price: 6_000 });
  });
});
