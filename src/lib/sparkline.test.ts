import { describe, it, expect } from "vitest";
import { buildSparkline } from "@/lib/sparkline";

describe("buildSparkline", () => {
  it("maps first/last points to the horizontal edges (inside padding)", () => {
    const s = buildSparkline(
      [
        { year: 2000, value: 0 },
        { year: 2010, value: 100 },
      ],
      100,
      40,
      4,
    );
    expect(s.dots[0].x).toBeCloseTo(4);
    expect(s.dots[1].x).toBeCloseTo(96);
    // value 0 → bottom (height - pad), value 100 → top (pad)
    expect(s.dots[0].y).toBeCloseTo(36);
    expect(s.dots[1].y).toBeCloseTo(4);
  });

  it("builds a line path starting with M and an area path closing to the baseline", () => {
    const s = buildSparkline(
      [
        { year: 2000, value: 10 },
        { year: 2010, value: 90 },
      ],
      100,
      40,
      4,
    );
    expect(s.linePath.startsWith("M")).toBe(true);
    expect(s.areaPath.startsWith("M")).toBe(true);
    expect(s.areaPath.trim().endsWith("Z")).toBe(true);
  });

  it("returns empty geometry for fewer than two points", () => {
    const s = buildSparkline([{ year: 2000, value: 50 }]);
    expect(s.linePath).toBe("");
    expect(s.areaPath).toBe("");
    expect(s.dots).toEqual([]);
  });
});
