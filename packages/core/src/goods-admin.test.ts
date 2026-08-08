import { describe, expect, it } from "vitest";
import { generateOptionCombinations } from "./goods-admin";

describe("generateOptionCombinations", () => {
  it("returns an empty array for no dimensions", () => {
    expect(generateOptionCombinations([])).toEqual([]);
  });

  it("generates one combination per value for a single dimension", () => {
    expect(generateOptionCombinations([{ name: "색상", values: ["화이트", "블랙"] }])).toEqual([["화이트"], ["블랙"]]);
  });

  it("generates the cartesian product across multiple dimensions", () => {
    const combos = generateOptionCombinations([
      { name: "색상", values: ["화이트", "블랙"] },
      { name: "사이즈", values: ["S", "M"] },
    ]);
    expect(combos).toEqual([
      ["화이트", "S"],
      ["화이트", "M"],
      ["블랙", "S"],
      ["블랙", "M"],
    ]);
  });

  it("skips blank values", () => {
    expect(generateOptionCombinations([{ name: "색상", values: ["화이트", "", "  "] }])).toEqual([["화이트"]]);
  });

  it("caps combinations at 1000", () => {
    const combos = generateOptionCombinations([
      { name: "a", values: Array.from({ length: 40 }, (_, i) => `a${i}`) },
      { name: "b", values: Array.from({ length: 40 }, (_, i) => `b${i}`) },
    ]);
    expect(combos.length).toBeLessThanOrEqual(1001);
  });
});
