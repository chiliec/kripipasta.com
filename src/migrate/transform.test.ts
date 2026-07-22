import { describe, it, expect } from "vitest";
import {
  unixToDate,
  mapStoryStatus,
  mapVoteValue,
  splitTags,
  hashVoterId,
  storySlug,
  sanitizeStoryHtml,
} from "./transform";

describe("unixToDate", () => {
  it("converts unix seconds to a Date", () => {
    expect(unixToDate(1379131174).getTime()).toBe(1379131174000);
  });
});

describe("mapStoryStatus", () => {
  it("maps approved === 1 to APPROVED", () => {
    expect(mapStoryStatus(1)).toBe("APPROVED");
  });
  it("maps 0 to PENDING", () => {
    expect(mapStoryStatus(0)).toBe("PENDING");
  });
});

describe("mapVoteValue", () => {
  it("maps legacy 1 -> +1 and 0 -> -1", () => {
    expect(mapVoteValue(1)).toBe(1);
    expect(mapVoteValue(0)).toBe(-1);
  });
});

describe("splitTags", () => {
  it("splits comma-space names and trims", () => {
    expect(splitTags("Худи, Hoody, Blaskyhoody Man")).toEqual([
      "Худи",
      "Hoody",
      "Blaskyhoody Man",
    ]);
  });
  it("returns [] for empty", () => {
    expect(splitTags("")).toEqual([]);
    expect(splitTags("   ")).toEqual([]);
  });
});

describe("hashVoterId", () => {
  it("is deterministic 64-char hex", () => {
    const a = hashVoterId("176.214.171.24");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hashVoterId("176.214.171.24")).toBe(a);
    expect(hashVoterId("46.146.59.17")).not.toBe(a);
  });
});

describe("storySlug", () => {
  it("keeps a non-empty url", () => {
    expect(storySlug("smile-dog", 42)).toBe("smile-dog");
  });
  it("falls back to story-{id} for empty url", () => {
    expect(storySlug("", 42)).toBe("story-42");
    expect(storySlug("  ", 7)).toBe("story-7");
  });
});

describe("sanitizeStoryHtml", () => {
  it("decodes entities and strips scripts", () => {
    const out = sanitizeStoryHtml("<p>hi&nbsp;<script>alert(1)</script>there</p>");
    expect(out).toContain("hi");
    expect(out).toContain("there");
    expect(out).not.toContain("<script>");
  });
  it("keeps allowed formatting tags", () => {
    expect(sanitizeStoryHtml("<p><b>bold</b><br></p>")).toContain("<b>bold</b>");
  });
});
