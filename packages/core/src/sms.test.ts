import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendSms, signCoolSmsAuthHeader } from "./sms";

describe("signCoolSmsAuthHeader", () => {
  it("computes the HMAC-SHA256 signature the same way coolSMS expects", () => {
    const fixedDate = new Date("2026-01-01T00:00:00.000Z");
    const header = signCoolSmsAuthHeader("KEY123", "SECRET456", fixedDate);

    // Salt is random per call, so extract the one this call actually
    // produced instead of mocking crypto.randomUUID (global crypto isn't
    // reliably spy-able across Node versions) and recompute the expected
    // signature from it.
    const match = header.match(/^HMAC-SHA256 apiKey=(.+), date=(.+), salt=(.+), signature=(.+)$/);
    expect(match).not.toBeNull();
    const [, apiKey, date, salt, signature] = match!;
    expect(apiKey).toBe("KEY123");
    expect(date).toBe(fixedDate.toISOString());

    const expectedSignature = createHmac("sha256", "SECRET456").update(date + salt).digest("hex");
    expect(signature).toBe(expectedSignature);
  });

  it("produces a different salt (and therefore signature) on every call", () => {
    const fixedDate = new Date("2026-01-01T00:00:00.000Z");
    const header1 = signCoolSmsAuthHeader("KEY123", "SECRET456", fixedDate);
    const header2 = signCoolSmsAuthHeader("KEY123", "SECRET456", fixedDate);
    expect(header1).not.toBe(header2);
  });
});

describe("sendSms", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("skips sending and never calls fetch when credentials aren't configured", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    // smsLog.create is exercised against the real dev DB in Playwright E2E,
    // not here — mock it out so this stays a pure unit test.
    const { prisma } = await import("@shoppingmall/db");
    vi.spyOn(prisma.smsLog, "create").mockResolvedValue({} as never);

    const result = await sendSms({ to: "01000000000", text: "hi" }, { smsYn: "N", smsKey: "", smsSecret: "", smsCallingNumber: "" });

    expect(result).toEqual({ ok: false, skipped: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("skips when sms_yn is Y but a required credential is still blank", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { prisma } = await import("@shoppingmall/db");
    vi.spyOn(prisma.smsLog, "create").mockResolvedValue({} as never);

    const result = await sendSms(
      { to: "01000000000", text: "hi" },
      { smsYn: "Y", smsKey: "key", smsSecret: "", smsCallingNumber: "0212345678" },
    );

    expect(result).toEqual({ ok: false, skipped: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
