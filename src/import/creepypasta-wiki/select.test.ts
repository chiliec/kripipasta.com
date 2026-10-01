import { describe, it, expect } from "vitest";
import { bestTier, sourceUrl, tagCategories, tierVotes } from "./select";

describe("bestTier", () => {
  it("picks the highest tier a page belongs to", () => {
    expect(bestTier(["Beings", "Historical Archive", "PotM"])).toBe("PotM");
    expect(bestTier(["Suggested Reading", "Historical Archive"])).toBe("Suggested Reading");
    expect(bestTier(["Beings"])).toBeNull();
  });
});

describe("tierVotes", () => {
  it("derives likes/dislikes from the tier percentage and ranks tiers in order", () => {
    expect(tierVotes("PotM")).toMatchObject({ likes: 94, dislikes: 6 });
    expect(tierVotes("PotM").score).toBeGreaterThan(tierVotes("Spotlighted Pastas").score);
    expect(tierVotes("Spotlighted Pastas").score).toBeGreaterThan(tierVotes("Suggested Reading").score);
    expect(tierVotes("Suggested Reading").score).toBeGreaterThan(tierVotes("Historical Archive").score);
  });
});

describe("tagCategories", () => {
  it("keeps topical categories and drops tier/meta/excluded ones", () => {
    const topical = new Set(["Beings", "Disappearances", "PotM", "Historical Archive", "NSFW", "EAP"]);
    expect(tagCategories(["Historical Archive", "PotM", "Beings", "Disappearances", "NSFW", "EAP", "Obscure"], topical))
      .toEqual(["Beings", "Disappearances"]);
  });
});

describe("sourceUrl", () => {
  it("builds the canonical wiki URL with underscores and encoding", () => {
    expect(sourceUrl("Jeff the Killer")).toBe("https://creepypasta.fandom.com/wiki/Jeff_the_Killer");
    expect(sourceUrl("Who was phone?")).toBe("https://creepypasta.fandom.com/wiki/Who_was_phone%3F");
  });
});
