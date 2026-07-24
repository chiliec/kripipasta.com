import { describe, it, expect } from "vitest";
import { normalizeQuery } from "./search";

describe("normalizeQuery", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeQuery("  the   rake  ")).toBe("the rake");
    expect(normalizeQuery("слендер\n\tмен")).toBe("слендер мен");
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(normalizeQuery("")).toBeNull();
    expect(normalizeQuery("   ")).toBeNull();
    expect(normalizeQuery(undefined)).toBeNull();
    expect(normalizeQuery(null)).toBeNull();
  });

  it("caps length at 100 characters", () => {
    const long = "a".repeat(250);
    expect(normalizeQuery(long)).toHaveLength(100);
  });

  it("preserves search operators for websearch_to_tsquery", () => {
    expect(normalizeQuery('"exact phrase" -exclude or thing')).toBe(
      '"exact phrase" -exclude or thing',
    );
  });
});
