import { describe, expect, it } from "vitest";
import { sanitizeRichText } from "./sanitize";

describe("sanitizeRichText", () => {
  it("strips script tags entirely", () => {
    expect(sanitizeRichText('<p>hi</p><script>alert(1)</script>')).toBe("<p>hi</p>");
  });

  it("strips inline event handlers", () => {
    expect(sanitizeRichText('<img src="x" onerror="alert(1)">')).not.toContain("onerror");
  });

  it("strips javascript: URLs from links", () => {
    const result = sanitizeRichText('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain("javascript:");
  });

  it("preserves basic formatting tags", () => {
    expect(sanitizeRichText("<p><b>bold</b> and <i>italic</i></p>")).toBe("<p><b>bold</b> and <i>italic</i></p>");
  });

  it("preserves safe links and images", () => {
    const input = '<a href="https://example.com">link</a><img src="https://example.com/a.png" alt="a">';
    const result = sanitizeRichText(input);
    expect(result).toContain('<a href="https://example.com">link</a>');
    expect(result).toContain('src="https://example.com/a.png"');
  });

  it("passes through empty strings unchanged", () => {
    expect(sanitizeRichText("")).toBe("");
  });
});
