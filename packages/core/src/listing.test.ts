import { describe, expect, it } from "vitest";
import { isGoodsSoldOut } from "./listing";

const available = { qty_type: 0, qty: 3, option_use: 0, option_soldout: 0, sale_use: 1 };

describe("legacy sold-out predicate", () => {
  it("treats zero finite stock without options as sold out", () => {
    expect(isGoodsSoldOut({ ...available, qty: 0 })).toBe(true);
  });

  it("does not treat option products as sold out from the base quantity alone", () => {
    expect(isGoodsSoldOut({ ...available, qty: 0, option_use: 1 })).toBe(false);
  });

  it("respects option sold-out and sale-disabled flags", () => {
    expect(isGoodsSoldOut({ ...available, option_soldout: 2 })).toBe(true);
    expect(isGoodsSoldOut({ ...available, sale_use: 0 })).toBe(true);
  });
});
