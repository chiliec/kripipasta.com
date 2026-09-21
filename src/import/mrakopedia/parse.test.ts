import { describe, it, expect } from "vitest";
import { parseRatingTable, parseHistoryDate, parseStoryPage } from "./parse";

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

const STORY_HTML = `<!DOCTYPE html><html><head><title>Папа придёт — Мракопедия</title>
<script>mw.config.set({"wgCanonicalNamespace":"","wgNamespaceNumber":0,"wgPageName":"Папа_придёт","wgTitle":"Папа придёт","wgArticleId":25939,"wgCategories":["Дети","Зомби","Крипи","Новый год"]});</script>
</head><body>
<div id="mw-content-text" lang="ru" dir="ltr" class="mw-content-ltr"><div id="toc"><ul><li>skip</li></ul></div>
<p><a href="/wiki/%D0%A4%D0%B0%D0%B9%D0%BB:Story-from-main.png"><img alt="Story-from-main.png" src="/w/images/thumb/8/8a/Story-from-main.png/40px-Story-from-main.png" width="40" height="40" srcset="/w/images/thumb/8/8a/Story-from-main.png/60px-Story-from-main.png 1.5x" /></a>
Первый абзац истории, достаточно длинный чтобы стать интро. Второе предложение.
</p>
<h2><span class="mw-headline" id="A">Глава</span><span class="mw-editsection"><span class="mw-editsection-bracket">[</span><a href="/w/index.php?title=X&amp;action=edit&amp;section=1" title="Редактировать">править</a><span class="mw-editsection-bracket">]</span></span></h2>
<div class="thumb"><img alt="Scary.jpg" src="/w/images/thumb/1/1a/Scary.jpg/300px-Scary.jpg" width="300" height="200" /></div>
<p>Второй абзац. См. <a href="/wiki/%D0%A7%D1%91%D1%80%D0%BD%D1%8B%D0%B9" title="Чёрный">другую историю</a>.</p>
<hr />
<p>Автор: Александр Матюхин
</p><p><a rel="nofollow" class="external text" href="https://story.boooka.ru/2018/papa.html">Источник</a>
</p>
<h2><span class="mw-headline" id="B">См также</span><span class="mw-editsection">[<a href="#">править</a>]</span></h2>
<ul><li><a href="/wiki/X">X</a></li></ul>
<p><br /> <span class="w4g_rb_area" id="w4g_rb_area-1">Текущий рейтинг</span>
<script type="text/javascript">//<![CDATA[
W4GRB.average_rating[1]=92; W4GRB.user_rating[1]=0; W4GRB.pid[1]=25939;
//]]></script></p>
<div class="rating_box" id="rating_box-1"><div class="rating_target">stars</div></div>
<!-- NewPP limit report Cached time: 20260912221920 -->
</div><div class="printfooter">Источник — «https://mrakopedia.net/w/index.php?title=X»</div>
</body></html>`;

describe("parseStoryPage", () => {
  const story = parseStoryPage(STORY_HTML)!;

  it("reads title, categories, rating, votes-independent pid", () => {
    expect(story.title).toBe("Папа придёт");
    expect(story.categories).toEqual(["Дети", "Зомби", "Крипи", "Новый год"]);
    expect(story.ratingPct).toBe(92);
    expect(story.pid).toBe(25939);
  });

  it("lifts author and source out of the trailing block", () => {
    expect(story.authorName).toBe("Александр Матюхин");
    expect(story.authorLink).toBe("https://story.boooka.ru/2018/papa.html");
    expect(story.bodyHtml).not.toContain("Автор:");
    expect(story.bodyHtml).not.toContain("Источник");
  });

  it("drops wiki chrome and everything from 'См также' onward", () => {
    for (const bad of ["mw-editsection", "id=\"toc\"", "См также", "W4GRB", "rating_box", "w4g_rb_area", "<!--", "<script", "printfooter", "srcset"]) {
      expect(story.bodyHtml).not.toContain(bad);
    }
    expect(story.bodyHtml).toContain("Первый абзац");
    expect(story.bodyHtml).toContain("Второй абзац");
    expect(story.bodyHtml).toMatch(/<h2>(<span[^>]*>)?Глава(<\/span>)?<\/h2>/);
  });

  it("absolutizes wiki links and image sources; drops icon-sized images", () => {
    expect(story.bodyHtml).toContain('href="https://mrakopedia.net/wiki/%D0%A7%D1%91%D1%80%D0%BD%D1%8B%D0%B9"');
    expect(story.bodyHtml).toContain('src="https://mrakopedia.net/w/images/1/1a/Scary.jpg"');
    expect(story.bodyHtml).not.toContain("Story-from-main.png");
    expect(story.imageUrls).toEqual(["https://mrakopedia.net/w/images/1/1a/Scary.jpg"]);
  });

  it("builds an intro from the first paragraph", () => {
    expect(story.intro).toMatch(/^Первый абзац истории/);
    expect(story.intro.length).toBeLessThanOrEqual(300);
  });

  it("returns null for non-article namespaces or missing content", () => {
    expect(parseStoryPage(STORY_HTML.replace('"wgNamespaceNumber":0', '"wgNamespaceNumber":4'))).toBeNull();
    expect(parseStoryPage("<html></html>")).toBeNull();
  });

  it("keeps a trailing block that is not just metadata", () => {
    const html = STORY_HTML.replace("<p>Автор: Александр Матюхин\n</p>", "<p>Автор: Александр Матюхин\n</p><p>Эпилог: они вернулись.</p>");
    const s = parseStoryPage(html)!;
    expect(s.authorName).toBe("Александр Матюхин");
    expect(s.bodyHtml).toContain("Эпилог");
  });
});
