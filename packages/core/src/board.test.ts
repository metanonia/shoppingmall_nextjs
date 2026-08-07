import { describe, expect, it } from "vitest";
import { BOARD_CONFIG, clampPage, isBoardId, resolveSecretFlag } from "./board";

describe("isBoardId", () => {
  it("accepts the 4 in-scope boards", () => {
    expect(isBoardId("notice")).toBe(true);
    expect(isBoardId("faq")).toBe(true);
    expect(isBoardId("counsel")).toBe(true);
    expect(isBoardId("gallery")).toBe(true);
  });

  it("rejects vendor-only boards not yet in scope (Phase 8)", () => {
    expect(isBoardId("vnotice")).toBe(false);
    expect(isBoardId("vcounsel")).toBe(false);
    expect(isBoardId("bogus")).toBe(false);
  });
});

describe("BOARD_CONFIG", () => {
  it("only counsel and gallery are writable", () => {
    expect(BOARD_CONFIG.notice.writable).toBe(false);
    expect(BOARD_CONFIG.faq.writable).toBe(false);
    expect(BOARD_CONFIG.counsel.writable).toBe(true);
    expect(BOARD_CONFIG.gallery.writable).toBe(true);
  });

  it("only gallery allows comments", () => {
    expect(BOARD_CONFIG.gallery.comments).toBe(true);
    expect(BOARD_CONFIG.notice.comments).toBe(false);
    expect(BOARD_CONFIG.faq.comments).toBe(false);
    expect(BOARD_CONFIG.counsel.comments).toBe(false);
  });
});

describe("resolveSecretFlag", () => {
  it("forces secret on for counsel (always)", () => {
    expect(resolveSecretFlag("always", false)).toBe(true);
    expect(resolveSecretFlag("always", undefined)).toBe(true);
  });

  it("forces secret off for faq/gallery (none)", () => {
    expect(resolveSecretFlag("none", true)).toBe(false);
  });

  it("respects the author's choice for notice (optional)", () => {
    expect(resolveSecretFlag("optional", true)).toBe(true);
    expect(resolveSecretFlag("optional", false)).toBe(false);
    expect(resolveSecretFlag("optional", undefined)).toBe(false);
  });
});

describe("clampPage", () => {
  it("clamps below-range pages up to 1", () => {
    expect(clampPage(0, 100, 15)).toEqual({ safePage: 1, totalPages: 7 });
    expect(clampPage(-5, 100, 15)).toEqual({ safePage: 1, totalPages: 7 });
  });

  it("clamps above-range pages down to the last page", () => {
    expect(clampPage(999, 100, 15)).toEqual({ safePage: 7, totalPages: 7 });
  });

  it("always returns at least 1 total page even with zero rows", () => {
    expect(clampPage(1, 0, 15)).toEqual({ safePage: 1, totalPages: 1 });
  });

  it("passes through an in-range page unchanged", () => {
    expect(clampPage(3, 100, 15)).toEqual({ safePage: 3, totalPages: 7 });
  });
});
