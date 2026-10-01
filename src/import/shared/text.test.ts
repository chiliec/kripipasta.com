import { describe, it, expect } from "vitest";
import { normalizeTitle, uniqueSlug } from "./text";

describe("normalizeTitle", () => {
  it("lowercases, folds ё, strips punctuation and spaces", () => {
    expect(normalizeTitle("Папа придёт!")).toBe("папапридет");
    expect(normalizeTitle("Jeff the Killer")).toBe("jeffthekiller");
  });
});

describe("uniqueSlug", () => {
  it("suffixes -2, -3 on collision and records the result", () => {
    const taken = new Set(["a", "a-2"]);
    expect(uniqueSlug("a", taken)).toBe("a-3");
    expect(taken.has("a-3")).toBe(true);
    expect(uniqueSlug("b", taken)).toBe("b");
  });
});
