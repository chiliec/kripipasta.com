import { describe, it, expect } from "vitest";
import {
  stripHtml,
  excerpt,
  readingTimeMinutes,
  formatStoryDate,
  ratingKey,
  sourceAttribution,
} from "./story-display";

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Hello   <b>world</b></p>\n<p>again</p>")).toBe(
      "Hello world again",
    );
  });

  it("decodes nothing and returns empty for empty input", () => {
    expect(stripHtml("")).toBe("");
  });
});

describe("excerpt", () => {
  it("prefers a non-empty intro verbatim when short enough", () => {
    expect(excerpt("Короткое интро.", "<p>тело</p>")).toBe("Короткое интро.");
  });

  it("falls back to stripped content when intro is empty", () => {
    expect(excerpt("", "<p>Тело истории здесь.</p>")).toBe(
      "Тело истории здесь.",
    );
  });

  it("truncates long text on a word boundary with an ellipsis", () => {
    const long = "one two three four five six seven eight nine ten";
    const out = excerpt("", `<p>${long}</p>`, 20);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(21);
    expect(out).not.toContain("  ");
  });
});

describe("readingTimeMinutes", () => {
  it("returns at least 1 minute for short content", () => {
    expect(readingTimeMinutes("<p>one two three</p>")).toBe(1);
  });

  it("rounds up based on 200 wpm", () => {
    const words = Array.from({ length: 450 }, () => "слово").join(" ");
    expect(readingTimeMinutes(`<p>${words}</p>`)).toBe(3);
  });
});

describe("formatStoryDate", () => {
  it("formats a date in Russian long form", () => {
    // 2026-03-03T12:00:00Z
    expect(formatStoryDate(new Date(Date.UTC(2026, 2, 3, 12)))).toBe(
      "3 марта 2026 г.",
    );
  });
});

describe("ratingKey", () => {
  it("labels high scores positively", () => {
    expect(ratingKey(8.5)).toBe("ratingGood");
  });

  it("labels mid scores neutrally", () => {
    expect(ratingKey(6)).toBe("ratingMixed");
  });

  it("labels low scores negatively", () => {
    expect(ratingKey(3)).toBe("ratingNiche");
  });
});

describe("sourceAttribution", () => {
  it("knows the SCP wiki and the Trollpasta Wiki", () => {
    expect(sourceAttribution("https://scp-wiki.wikidot.com/unfinished-business")).toEqual({
      label: "SCP Foundation",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    });
    expect(sourceAttribution("https://trollpasta.com/wiki/Blood_Whistle")).toEqual({
      label: "Trollpasta Wiki",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    });
  });
  it("knows Mrakopedia and the Creepypasta Wiki", () => {
    expect(sourceAttribution("https://mrakopedia.net/wiki/%D0%9F")).toEqual({
      label: "Мракопедия",
      license: "CC BY-NC-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    });
    expect(sourceAttribution("https://creepypasta.fandom.com/wiki/Jeff_the_Killer")).toEqual({
      label: "Creepypasta Wiki",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    });
  });
  it("falls back to the host with no license, and null for empty", () => {
    expect(sourceAttribution("https://example.org/x")).toEqual({ label: "example.org" });
    expect(sourceAttribution("")).toBeNull();
    expect(sourceAttribution("not a url")).toBeNull();
  });
});
