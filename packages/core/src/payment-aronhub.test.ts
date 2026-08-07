import { afterEach, describe, expect, it, vi } from "vitest";
import { AronhubPaymentGateway } from "./payment-aronhub";

const gateway = new AronhubPaymentGateway({ paymentShopId: "sid-card", paymentShopKey: "sid-phone" });

describe("AronhubPaymentGateway.createPaymentRequest", () => {
  it("uses the card SID and card Start.asp URL for payType C", async () => {
    const result = await gateway.createPaymentRequest({
      orderNum: "o1",
      amount: 1000,
      payType: "C",
      buyerId: "member1",
      buyerName: "홍길동",
      buyerEmail: "a@b.com",
      itemName: "상품",
      returnUrl: "https://shop.example/cb",
      userUrl: "https://shop.example/return",
      cancelUrl: "https://shop.example/cancel",
    });
    expect(result.kind).toBe("form-post");
    if (result.kind === "form-post") {
      expect(result.actionUrl).toBe("https://api.aronhub.com/api/danal/card1/Start.asp");
      expect(result.fields.SID).toBe("sid-card");
      expect(result.fields.ORDERID).toBe("o1");
      expect(result.fields.AMOUNT).toBe("1000");
    }
  });

  it("uses the phone SID and phone Start.asp URL for payType H", async () => {
    const result = await gateway.createPaymentRequest({
      orderNum: "o2",
      amount: 2000,
      payType: "H",
      buyerId: "",
      buyerName: "guest",
      buyerEmail: "",
      itemName: "상품",
      returnUrl: "https://shop.example/cb",
      userUrl: "https://shop.example/return",
      cancelUrl: "https://shop.example/cancel",
    });
    expect(result.kind).toBe("form-post");
    if (result.kind === "form-post") {
      expect(result.actionUrl).toBe("https://api.aronhub.com/api/danal/phone/Start.asp");
      expect(result.fields.SID).toBe("sid-phone");
      expect(result.fields.USERID).toBe("guest"); // falls back when buyerId is empty (guest checkout)
    }
  });
});

describe("AronhubPaymentGateway.parseCallback", () => {
  it("fails when a required field is missing", () => {
    const result = gateway.parseCallback({ SID: "x", USERID: "y", AMOUNT: "1000", MCTTRNO: "t", ORDERID: "o1" });
    expect(result).toEqual({ ok: false, reason: "MISSING_FIELDS" }); // USERIP missing
  });

  it("parses a complete callback payload", () => {
    const result = gateway.parseCallback({
      SID: "sid-card",
      USERID: "member1",
      USERIP: "127.0.0.1",
      AMOUNT: "59000",
      MCTTRNO: "TXN123",
      ORDERID: "260808-0000_00001",
    });
    expect(result).toEqual({ ok: true, orderNum: "260808-0000_00001", amount: 59000, pgTransactionId: "TXN123" });
  });
});

describe("AronhubPaymentGateway.cancelPayment", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("succeeds when aronhub returns ReplyCode 000000", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ ReplyCode: "000000" }) }),
    );
    const result = await gateway.cancelPayment({ payType: "C", pgTransactionId: "TXN123", amount: 59000 });
    expect(result).toEqual({ ok: true });
  });

  it("fails with the reply code when aronhub rejects the cancel", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => ({ ReplyCode: "999999" }) }),
    );
    const result = await gateway.cancelPayment({ payType: "H", pgTransactionId: "TXN999", amount: 1000 });
    expect(result).toEqual({ ok: false, reason: "ARONHUB_999999" });
  });

  it("fails gracefully on a network error instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    const result = await gateway.cancelPayment({ payType: "C", pgTransactionId: "TXN1", amount: 1000 });
    expect(result).toEqual({ ok: false, reason: "network down" });
  });
});
