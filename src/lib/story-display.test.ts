import { describe, it, expect } from "vitest";
import {
  stripHtml,
  excerpt,
  readingTimeMinutes,
  formatStoryDate,
  ratingLabel,
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

describe("ratingLabel", () => {
  it("labels high scores positively", () => {
    expect(ratingLabel(8.5)).toBe("Стоит прочесть");
  });

  it("labels mid scores neutrally", () => {
    expect(ratingLabel(6)).toBe("Неоднозначно");
  });

  it("labels low scores negatively", () => {
    expect(ratingLabel(3)).toBe("На любителя");
  });
});
