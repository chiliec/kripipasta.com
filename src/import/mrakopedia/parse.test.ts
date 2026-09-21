import { describe, it, expect } from "vitest";
import { parseRatingTable, parseHistoryDate } from "./parse";

const RATING_HTML = `
<table class="w4g_rb-ratinglist-table sortable"><caption>Страницы</caption>
<tr><th>Страница</th><th>Рейтинг</th><th>Количество голосов</th></tr>
<tr><td><a href="/wiki/%D0%9F%D0%B0%D0%BF%D0%B0_%D0%BF%D1%80%D0%B8%D0%B4%D1%91%D1%82" title="Папа придёт">Папа придёт</a></td><td>92%</td><td>690</td></tr>
<tr><td><a href="/wiki/%D0%98%D1%81%D1%82%D0%B8%D0%BD%D0%B0_(%D0%AE._%D0%9D.)" title="Истина (Ю. Н.)">Истина (Ю. Н.)</a></td><td>92%</td><td>16</td></tr>
<tr><td><a href="/wiki/A%26B" title="A &amp; B">A &amp; B</a></td><td>85%</td><td>1118</td></tr>
</table>`;

describe("parseRatingTable", () => {
  it("extracts title, href, rating and votes per row", () => {
    const rows = parseRatingTable(RATING_HTML);
    expect(rows).toEqual([
      { title: "Папа придёт", href: "/wiki/%D0%9F%D0%B0%D0%BF%D0%B0_%D0%BF%D1%80%D0%B8%D0%B4%D1%91%D1%82", ratingPct: 92, votes: 690 },
      { title: "Истина (Ю. Н.)", href: "/wiki/%D0%98%D1%81%D1%82%D0%B8%D0%BD%D0%B0_(%D0%AE._%D0%9D.)", ratingPct: 92, votes: 16 },
      { title: "A & B", href: "/wiki/A%26B", ratingPct: 85, votes: 1118 },
    ]);
  });

  it("returns [] when the table is absent", () => {
    expect(parseRatingTable("<html><body>nope</body></html>")).toEqual([]);
  });
});

describe("parseHistoryDate", () => {
  it("parses the Russian genitive date of the single history row", () => {
    const html = `<li><a href="/w/index.php?title=X&amp;oldid=152684" class="mw-changeslist-date" title="X">14:42, 29 июля 2018</a></li>`;
    expect(parseHistoryDate(html)).toEqual(new Date(Date.UTC(2018, 6, 29, 14, 42)));
  });

  it("returns null when no date is present", () => {
    expect(parseHistoryDate("<ul></ul>")).toBeNull();
  });
});
