import { describe, it, expect } from "vitest";
import { canonicalImageUrl, downloadUrl, parseStoryJson } from "./parse";

const IMG = "https://static.wikia.nocookie.net/creepypasta/images/6/6c/Dragon-tattoo-1.gif/revision/latest";

const ARCHIVE_PAGE = {
  parse: {
    title: "29th Dragon",
    pageid: 36481,
    text: {
      "*": `<div class="mw-content-ltr mw-parser-output" lang="en" dir="ltr"><figure class="thumb mw-halign-right show-info-icon" typeof="mw:File/Thumb" style="width: 300px"> <a href="${IMG}?cb=20120308151948" class="mw-file-description image"><img alt="Dragon-tattoo-1" src="${IMG}/scale-to-width-down/300?cb=20120308151948" decoding="async" loading="lazy" width="300" height="266" class="thumbimage" data-image-name="Dragon-tattoo-1.gif" data-image-key="Dragon-tattoo-1.gif" /></a> <figcaption class="thumbcaption"> <a href="/wiki/File:Dragon-tattoo-1.gif" class="internal" title="Enlarge"><svg><use xlink:href="#wds-icons-zoom-small"></use></svg></a>The tattoo</figcaption></figure>
<p>My uncle has a tattoo of a <a href="/wiki/Dragons" title="Dragons">dragon</a>.
</p><p>It moves at night.
</p>
<p></p>
<div style="margin: 2em 0 .5em;"><hr /> <i>Original author unknown</i></div>
<p><i>Originally uploaded on March 8th, 2012</i>
</p>
<!-- NewPP limit report Cached time: 20260928144512 -->
</div>`,
    },
    categories: [{ sortkey: "", "*": "Historical_Archive" }, { sortkey: "", "*": "PotM" }, { sortkey: "", "*": "Beings" }],
  },
};

const AUTHORED_PAGE = {
  parse: {
    title: "The Thing in the Walls",
    pageid: 777,
    text: {
      "*": `<div class="mw-content-ltr mw-parser-output" lang="en" dir="ltr"><div id="toc" class="toc"><ul><li>1 Part one</li></ul></div>
<h2><span class="mw-headline" id="Part_one">Part one</span><span class="mw-editsection"><span class="mw-editsection-bracket">[</span><a href="/wiki/X?action=edit">edit</a><span class="mw-editsection-bracket">]</span></span></h2>
<p>It scratches. It scratches every night, and I cannot sleep anymore because of it.
</p>
<p><span id="nav"></span><span id="navigation"></span></p><div align="center" style="margin-top:2em;"><p><b><a href="/wiki/Prev" title="Prev">&lt; Previous</a> | <a href="/wiki/Next" title="Next">Next &gt;</a></b></p></div>
<p><br style="clear:both;" /></p><hr />
<p><i>Written by <a href="/wiki/User:Banningk1979" title="User:Banningk1979">Banningk1979</a><br />Originally uploaded on November 7th, 2012<br />
<span class="plainlinks">Content is available under <a target="_blank" rel="nofollow noreferrer noopener" class="external text" href="http://creativecommons.org/licenses/by-sa/4.0">CC BY-SA</a></span></i>
</p>
</div>`,
    },
    categories: [{ sortkey: "", "*": "Suggested_Reading" }, { sortkey: "", "*": "Beings" }],
  },
};

describe("parseStoryJson", () => {
  it("extracts title, categories (spaces), body, intro, images; strips chrome and footer", () => {
    const p = parseStoryJson(ARCHIVE_PAGE)!;
    expect(p.pageid).toBe(36481);
    expect(p.title).toBe("29th Dragon");
    expect(p.categories).toEqual(["Historical Archive", "PotM", "Beings"]);
    expect(p.authorName).toBe("");
    expect(p.authorLink).toBe("");
    expect(p.imageUrls).toEqual([IMG]);
    expect(p.bodyHtml).toContain(`src="${IMG}"`);
    expect(p.bodyHtml).toContain('href="https://creepypasta.fandom.com/wiki/Dragons"');
    expect(p.bodyHtml).not.toContain("<!--");
    expect(p.bodyHtml).not.toContain("Original author unknown");
    expect(p.bodyHtml).not.toContain("Originally uploaded");
    expect(p.bodyHtml).not.toContain("data-image-name");
    expect(p.bodyHtml).not.toContain("<svg");
    expect(p.intro).toBe("My uncle has a tattoo of a dragon.");
  });

  it("lifts the author footer, drops toc/editsection/nav block", () => {
    const p = parseStoryJson(AUTHORED_PAGE)!;
    expect(p.authorName).toBe("Banningk1979");
    expect(p.authorLink).toBe("https://creepypasta.fandom.com/wiki/User:Banningk1979");
    expect(p.bodyHtml).not.toContain("Written by");
    expect(p.bodyHtml).not.toContain("Content is available");
    expect(p.bodyHtml).not.toContain("mw-editsection");
    expect(p.bodyHtml).not.toContain('id="toc"');
    expect(p.bodyHtml).not.toContain('id="nav"');
    expect(p.bodyHtml).not.toContain("Previous");
    expect(p.bodyHtml).toContain("<h2>Part one</h2>");
    expect(p.bodyHtml).toContain("It scratches.");
  });

  it("lifts the 'Credited to' external-link footer", () => {
    const text = `<div class="mw-parser-output"><p>A week later six more had marked me as a friend.
</p>
<p><span id="credit"></span><br style="clear:both;" /></p><hr /><p><i>Credited to&#160;<span class="plainlinks"><a target="_blank" rel="nofollow noreferrer noopener" class="external text" href="http://unxmaal.com/archives/1849/"><span>Eric Dodd&#160;</span></a></span><br />Originally uploaded on February 28th, 2012</i></p></div>`;
    const p = parseStoryJson({ parse: { title: "Friend", pageid: 1, text: { "*": text }, categories: [] } })!;
    expect(p.authorName).toBe("Eric Dodd");
    expect(p.authorLink).toBe("http://unxmaal.com/archives/1849/");
    expect(p.bodyHtml).not.toContain("Credited to");
    expect(p.bodyHtml).not.toContain("Originally uploaded");
    expect(p.bodyHtml).toContain("six more");
  });

  it("cuts freeform trailing footers (stacked <i> lines, 'Originally uploaded' first)", () => {
    const text = `<div class="mw-parser-output"><p>"One night I'll wake up to see him staring at me."
</p>
<hr />
<p><i>Originally uploaded on August 8th, 2010</i><br />
<i>Credited to <a target="_blank" rel="nofollow noreferrer noopener" href="https://example.com/rake">Bryan Somerville</a></i><br />
<i>Earliest story source found <a href="https://example.com/src">here</a></i>
</p></div>`;
    const p = parseStoryJson({ parse: { title: "The Rake", pageid: 2, text: { "*": text }, categories: [] } })!;
    expect(p.authorName).toBe("Bryan Somerville");
    expect(p.authorLink).toBe("https://example.com/rake");
    expect(p.bodyHtml).not.toMatch(/Originally uploaded|Credited to|Earliest story/);
    expect(p.bodyHtml).toContain("staring at me");
  });

  it("returns null for error / missing responses", () => {
    expect(parseStoryJson({ error: { code: "missingtitle" } })).toBeNull();
    expect(parseStoryJson(null)).toBeNull();
  });
});

describe("image urls", () => {
  it("canonicalises thumbs and cache-busters, rejects foreign hosts", () => {
    expect(canonicalImageUrl(`${IMG}/scale-to-width-down/300?cb=1`)).toBe(IMG);
    expect(canonicalImageUrl(`${IMG}?cb=1`)).toBe(IMG);
    expect(canonicalImageUrl("https://example.com/x.png")).toBeNull();
    expect(downloadUrl(IMG)).toBe(`${IMG}?format=original`);
  });
});
