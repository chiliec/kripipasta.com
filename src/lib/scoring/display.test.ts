import { describe, it, expect } from "vitest";
import { storyScore10, dossierPopularity100 } from "./display";

describe("score display helpers", () => {
  it("maps a [0,1] score to a /10 value rounded to 2 decimals", () => {
    expect(storyScore10(0.762)).toBe(7.62);
    expect(storyScore10(0)).toBe(0);
    expect(storyScore10(1)).toBe(10);
  });

  it("maps a [0,1] score to a /100 integer", () => {
    expect(dossierPopularity100(0.91)).toBe(91);
    expect(dossierPopularity100(0.9149)).toBe(91);
    expect(dossierPopularity100(1)).toBe(100);
  });
});
