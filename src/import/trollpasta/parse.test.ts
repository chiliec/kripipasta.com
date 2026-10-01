import { describe, it, expect } from "vitest";
import { canonicalImageUrl, downloadUrl, parseStoryJson } from "./parse";

const THUMB = "//static.wikitide.net/trollpastawiki/thumb/1/1e/Blood_Whistle.jpg/300px-Blood_Whistle.jpg";
const IMG = "https://static.wikitide.net/trollpastawiki/1/1e/Blood_Whistle.jpg";

const CREDITED_PAGE = {
  parse: {
    title: "Blood Whistle",
    pageid: 1234,
    text: {
      "*": `<div class="mw-content-ltr mw-parser-output" lang="en" dir="ltr"><figure class="mw-halign-right" typeof="mw:File/Thumb"><a href="/wiki/File:Blood_Whistle.jpg" class="mw-file-description"><img src="${THUMB}" decoding="async" width="300" height="200" class="mw-file-element" /></a><figcaption>The whistle</figcaption></figure>
<p>So I bought a whistle made of <a href="/wiki/Blood" title="Blood">blood</a>.
</p><p>It was hyper-realistic.
</p>
<figure class="embedvideo" data-service="youtube"><span class="embedvideo-wrapper"><iframe src="https://www.youtube.com/embed/xyz" allowfullscreen=""></iframe></span><figcaption>Reading by Mr. Creepy</figcaption></figure>
<hr />
<p><i>
Credited to <a href="https://community.fandom.com/wiki/w:c:creepypasta:user:Furbearingbrick" class="extiw" title="w:c:creepypasta:user:Furbearingbrick">Furbearingbrick</a>
</i>
</p>
<div style="clear:both;"></div>
<table style="width: 100%; background:#5d7994; border-radius: 10px;"><tbody><tr><td><b>Comments</b></td></tr></tbody></table>
<table style="width:100%"><tbody><tr><td><div class="comments-body" id="comments-body">Loading comments...</div></td></tr></tbody></table>
<!-- NewPP limit report Cached time: 20261001 -->
</div>`,
    },
    categories: [{ sortkey: "", "*": "Hall_of_Fame" }, { sortkey: "", "*": "Lost_Episodes" }, { sortkey: "", "*": "Videos" }],
  },
};

const ORIGINALLY_ON_PAGE = {
  parse: {
    title: "Squidward's Suicide",
    pageid: 99,
    text: {
      "*": `<div class="mw-parser-output"><p>I was an intern at Nickelodeon Studios.
</p>
<hr /><p><i>
Originally on Geoshea's Lost Episodes Wiki
</i></p>
</div>`,
    },
    categories: [{ sortkey: "", "*": "Classics" }],
  },
};

const page = (text: string) => ({ parse: { title: "T", pageid: 1, text: { "*": `<div class="mw-parser-output"><p>Body.</p>${text}</div>` }, categories: [] } });

describe("parseStoryJson", () => {
  it("handles the 'Written by' wiki-user footer and unlinked credits", () => {
    const written = parseStoryJson(page(`<hr />\n<p><i>\nWritten by <a href="/wiki/User:Meaty" title="User:Meaty">Meaty</a><br />\n<span class="plainlinks">Content is available under <a href="http://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA</a></span></i></p>`))!;
    expect(written.authorName).toBe("Meaty");
    expect(written.authorLink).toBe("https://trollpasta.com/wiki/User:Meaty");
    expect(written.bodyHtml).not.toContain("Content is available");

    const plain = parseStoryJson(page(`<hr /><p><i>Credited to&#160;Solitarix&#160;</i>\n<br />\n</p><h2 id="YouTube_readings">YouTube readings</h2>`))!;
    expect(parseStoryJson(page(`<table><tbody><tr><td><b>IT'S JUST A JOKE, BRO!</b></td></tr></tbody></table>`))!.bodyHtml).not.toContain("JOKE");
    expect(plain.authorName).toBe("Solitarix");
    expect(plain.authorLink).toBe("");
    expect(plain.bodyHtml).not.toContain("Credited");
    expect(plain.bodyHtml).not.toContain("YouTube");
  });

  it("lifts the 'Credited to' footer and strips comments, embeds and chrome", () => {
    const p = parseStoryJson(CREDITED_PAGE)!;
    expect(p.pageid).toBe(1234);
    expect(p.title).toBe("Blood Whistle");
    expect(p.categories).toEqual(["Hall of Fame", "Lost Episodes", "Videos"]);
    expect(p.authorName).toBe("Furbearingbrick");
    expect(p.authorLink).toBe("https://community.fandom.com/wiki/w:c:creepypasta:user:Furbearingbrick");
    expect(p.imageUrls).toEqual([IMG]);
    expect(p.bodyHtml).toContain(`src="${IMG}"`);
    expect(p.bodyHtml).toContain('href="https://trollpasta.com/wiki/Blood"');
    expect(p.bodyHtml).toContain("It was hyper-realistic.");
    expect(p.bodyHtml).not.toContain("Credited to");
    expect(p.bodyHtml).not.toContain("<iframe");
    expect(p.bodyHtml).not.toContain("Mr. Creepy");
    expect(p.bodyHtml).not.toContain("Loading comments");
    expect(p.bodyHtml).not.toContain("Comments");
    expect(p.bodyHtml).not.toContain("<table");
    expect(p.bodyHtml).not.toContain("<!--");
    expect(p.intro).toBe("So I bought a whistle made of blood.");
  });

  it("removes the 'Originally on' footer without an author", () => {
    const p = parseStoryJson(ORIGINALLY_ON_PAGE)!;
    expect(p.authorName).toBe("");
    expect(p.authorLink).toBe("");
    expect(p.bodyHtml).not.toContain("Originally on");
    expect(p.bodyHtml).toContain("Nickelodeon");
  });

  it("returns null for error / missing responses", () => {
    expect(parseStoryJson({ error: { code: "missingtitle" } })).toBeNull();
    expect(parseStoryJson(null)).toBeNull();
  });
});

describe("image urls", () => {
  it("maps wikitide thumbs and protocol-relative paths to the original file", () => {
    expect(canonicalImageUrl(THUMB)).toBe(IMG);
    expect(canonicalImageUrl(`https:${THUMB}`)).toBe(IMG);
    expect(canonicalImageUrl("https://static.wikitide.net/trollpastawiki/1/1e/Blood_Whistle.jpg")).toBe(IMG);
    expect(canonicalImageUrl("https://static.wikia.nocookie.net/x/y.png")).toBeNull();
    expect(downloadUrl(IMG)).toBe(IMG);
  });
});
