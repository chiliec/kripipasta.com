import { describe, it, expect } from "vitest";
import {
  deriveVotes, rankRows, hasAuthorSuffix, normalizeTitle, tagCategories, uniqueSlug, historyUrl,
} from "./select";

describe("deriveVotes", () => {
  it("splits votes by rating percent and scores with Wilson", () => {
    const v = deriveVotes(92, 690);
    expect(v.likes).toBe(635);
    expect(v.dislikes).toBe(55);
    expect(v.score).toBeGreaterThan(0.89);
    expect(v.score).toBeLessThan(0.92);
  });
});

describe("rankRows", () => {
  it("prefers many votes at similar rating over few", () => {
    const rows = [
      { title: "few", href: "/wiki/few", ratingPct: 92, votes: 16 },
      { title: "many", href: "/wiki/many", ratingPct: 91, votes: 1118 },
    ];
    expect(rankRows(rows).map((r) => r.title)).toEqual(["many", "few"]);
  });
});

describe("hasAuthorSuffix", () => {
  it.each([
    ["1408 (Стивен Кинг)", true],
    ["Истина (Ю. Нестеренко)", true],
    ["Призрак V (Р. Шекли)", true],
    ["Папа придёт", false],
    ["Экзорцизм (комикс)", false],
    ["Дом (2 часть)", false],
  ])("%s → %s", (title, expected) => {
    expect(hasAuthorSuffix(title)).toBe(expected);
  });
});

describe("normalizeTitle", () => {
  it("folds case, ё and punctuation", () => {
    expect(normalizeTitle("Чёрный  Мороз!")).toBe("черныймороз");
    expect(normalizeTitle("черный мороз")).toBe("черныймороз");
  });
});

describe("tagCategories", () => {
  it("drops meta categories and keeps thematic ones", () => {
    expect(tagCategories(["Дети", "Крипи", "Рейтинг", "Избранное", "Мракопедия:Служебное", "Зомби"]))
      .toEqual(["Дети", "Зомби"]);
  });
});

describe("uniqueSlug", () => {
  it("suffixes -2, -3 on collision and records the result", () => {
    const taken = new Set(["dom", "dom-2"]);
    expect(uniqueSlug("dom", taken)).toBe("dom-3");
    expect(taken.has("dom-3")).toBe(true);
    expect(uniqueSlug("les", taken)).toBe("les");
  });
});

describe("historyUrl", () => {
  it("builds the first-revision history URL from a /wiki/ href", () => {
    expect(historyUrl("/wiki/%D0%9F%D0%B0%D0%BF%D0%B0")).toBe(
      "https://mrakopedia.net/w/index.php?title=%D0%9F%D0%B0%D0%BF%D0%B0&action=history&dir=prev&limit=1",
    );
  });
});
