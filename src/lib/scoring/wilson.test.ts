import { describe, it, expect } from "vitest";
import { wilsonScore } from "./wilson";

describe("wilsonScore", () => {
  it("returns 0 when there are no votes", () => {
    expect(wilsonScore(0, 0)).toBe(0);
  });

  it("returns a value strictly between 0 and 1 for a single like", () => {
    const s = wilsonScore(1, 0);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });

  it("rewards more votes at the same ratio (confidence)", () => {
    expect(wilsonScore(100, 0)).toBeGreaterThan(wilsonScore(1, 0));
  });

  it("scores a mostly-disliked item near zero", () => {
    expect(wilsonScore(0, 20)).toBeLessThan(0.1);
  });

  it("ranks a higher like-ratio above a lower one at equal volume", () => {
    expect(wilsonScore(90, 10)).toBeGreaterThan(wilsonScore(60, 40));
  });
});
