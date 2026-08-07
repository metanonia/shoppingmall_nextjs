import { describe, expect, it } from "vitest";
import { AronhubPaymentGateway } from "./payment-aronhub";
import { MockPaymentGateway, getPaymentGateway } from "./payment";

describe("getPaymentGateway", () => {
  it("falls back to Mock when payment_cp isn't set to ARONHUB", () => {
    const config = { paymentCp: "", paymentShopId: "sid-card", paymentShopKey: "sid-phone" };
    expect(getPaymentGateway("C", config)).toBe(MockPaymentGateway);
    expect(getPaymentGateway("H", config)).toBe(MockPaymentGateway);
  });

  it("falls back to Mock per pay-type when that type's SID column is empty, even under ARONHUB", () => {
    const config = { paymentCp: "ARONHUB", paymentShopId: "sid-card", paymentShopKey: "" };
    expect(getPaymentGateway("C", config)).toBeInstanceOf(AronhubPaymentGateway);
    expect(getPaymentGateway("H", config)).toBe(MockPaymentGateway);
  });

  it("uses Aronhub for both pay types once both SID columns are filled in", () => {
    const config = { paymentCp: "ARONHUB", paymentShopId: "sid-card", paymentShopKey: "sid-phone" };
    expect(getPaymentGateway("C", config)).toBeInstanceOf(AronhubPaymentGateway);
    expect(getPaymentGateway("H", config)).toBeInstanceOf(AronhubPaymentGateway);
  });
});

describe("MockPaymentGateway", () => {
  it("createPaymentRequest points at the mock checkout route with the order number", async () => {
    const result = await MockPaymentGateway.createPaymentRequest({
      orderNum: "260808-0000_00001",
      amount: 1000,
      payType: "C",
      buyerId: "member1",
      buyerName: "홍길동",
      buyerEmail: "a@b.com",
      itemName: "테스트 상품",
      returnUrl: "http://localhost:3000/api/payment/aronhub/callback",
      userUrl: "http://localhost:3000/api/payment/aronhub/return",
      cancelUrl: "http://localhost:3000/api/payment/aronhub/close",
    });
    expect(result.kind).toBe("redirect");
    if (result.kind === "redirect") {
      expect(result.url).toContain("/api/payment/mock/checkout");
      expect(result.url).toContain("orderNum=260808-0000_00001");
    }
  });

  it("cancelPayment always succeeds", async () => {
    const result = await MockPaymentGateway.cancelPayment({ payType: "C", pgTransactionId: "x", amount: 1000 });
    expect(result).toEqual({ ok: true });
  });
});
