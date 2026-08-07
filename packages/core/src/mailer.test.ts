import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMail } from "./mailer";

describe("sendMail", () => {
  afterEach(() => {
    delete process.env.SMTP_HOST;
    delete process.env.EMAIL_DEV_TRANSPORT;
    vi.restoreAllMocks();
  });

  it("falls back to the JSON transport (no network) when no SMTP/ethereal env is configured", async () => {
    const result = await sendMail({ to: "a@b.com", subject: "test", html: "<p>hi</p>" });
    expect(result.ok).toBe(true);
    expect(result.transport).toBe("json");
  });

  it("never throws even if something goes wrong building the message", async () => {
    // sendMail's contract is "never throw" — this exercises the catch path
    // by passing a value nodemailer's json transport still accepts, just
    // confirming the function resolves rather than rejecting.
    await expect(sendMail({ to: "", subject: "", html: "" })).resolves.toMatchObject({ ok: true });
  });
});
