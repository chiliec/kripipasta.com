import { describe, it, expect } from "vitest";
import { wilsonScore } from "@/lib/scoring/wilson";
import { bestTier, sourceUrl, tagNames, tierVotes } from "./select";

describe("bestTier", () => {
  it("picks the highest tier a page belongs to", () => {
    expect(bestTier(["Videos", "Featured Pastas", "FOTM"])).toBe("FOTM");
    expect(bestTier(["Classics", "Featured Pastas"])).toBe("Classics");
    expect(bestTier(["Videos"])).toBeNull();
  });
});

describe("tierVotes", () => {
  it("ranks tiers in order and keeps all of them below the lowest Creepypasta Wiki tier (78%)", () => {
    expect(tierVotes("Hall of Fame")).toMatchObject({ likes: 72, dislikes: 28 });
    expect(tierVotes("Hall of Fame").score).toBeGreaterThan(tierVotes("FOTM").score);
    expect(tierVotes("FOTM").score).toBeGreaterThan(tierVotes("Classics").score);
    expect(tierVotes("Classics").score).toBeGreaterThan(tierVotes("Featured Pastas").score);
    expect(tierVotes("Hall of Fame").score).toBeLessThan(wilsonScore(78, 22));
  });
});

describe("tagNames", () => {
  it("always tags Trollpasta and maps whitelisted franchise categories", () => {
    expect(tagNames(["Hall of Fame", "Lost Episodes", "Minecrap", "Videos", "Shortpasta"]))
      .toEqual(["Trollpasta", "Lost Episodes", "Minecraft"]);
    expect(tagNames([])).toEqual(["Trollpasta"]);
  });
});

describe("sourceUrl", () => {
  it("builds the canonical wiki URL with underscores and encoding", () => {
    expect(sourceUrl("Blood Whistle")).toBe("https://trollpasta.com/wiki/Blood_Whistle");
    expect(sourceUrl("Who was phone?")).toBe("https://trollpasta.com/wiki/Who_was_phone%3F");
  });
});
