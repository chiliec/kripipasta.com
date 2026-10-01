import { describe, it, expect } from "vitest";
import { parseTalePage } from "./parse";

const IMG = "https://scp-wiki.wdfiles.com/local--files/unfinished-business/counter.png";

const PAGE = `<html><body><div id="main-content"><div id="page-title">Unfinished Business</div>
<div id="page-content">
<div style="text-align: right;"><div class="page-rate-widget-box"><span class="rate-points">rating: <span class="number prw54353">+2110</span></span><span class="rateup btn btn-default"><a title="I like it" href="javascript:;">+</a></span></div></div>
<div style="text-align: right; margin-right: 2em; margin-top: -20px;"><p>by <a href="/qntm-s-author-page">qntm</a></p></div>
<p>Marion Wheeler walks into the office and <a href="/scp-055">forgets</a>.</p>
<div class="collapsible-block"><div class="collapsible-block-folded"><a class="collapsible-block-link" href="javascript:;">+ Show the memo</a></div><div class="collapsible-block-unfolded" style="display:none"><div class="collapsible-block-unfolded-link"><a class="collapsible-block-link" href="javascript:;">- Hide the memo</a></div><div class="collapsible-block-content"><p>The memo says nothing.</p></div></div></div>
<div class="scp-image-block block-right" style="width:300px;"><img src="//scp-wiki.wdfiles.com/local--files/unfinished-business/counter.png" style="width:300px;" alt="counter.png" class="image" /><div class="scp-image-caption" style="width:300px;"><p>The counter</p></div></div>
<p><img src="http://scp-wiki.wikidot.com/local--files/unfinished-business/old.jpg" alt="old" /> <span class="printuser avatarhover"><a href="http://www.wikidot.com/user:info/qntm"><img class="small" src="https://www.wikidot.com/avatar.php?userid=1&amp;size=small" alt="qntm" /></a></span></p>
<p>She writes it down.<sup class="footnoteref"><a href="javascript:;" id="footnoteref-1" class="footnoteref">1</a></sup></p>
<div class="footnotes-footer"><div class="title">Footnotes</div><div id="footnote-1" class="footnote-footer"><a href="javascript:;">1</a>. Again.</div></div>
<div class="code"><pre><span class="hl-code">div.page-rate-widget-box .rate-points {
    color: #333;
}</span></pre></div>
<div class="code"><pre>Login: E_Mann</pre></div>
<div class="licensebox"><div class="collapsible-block"><div class="collapsible-block-folded"><a class="collapsible-block-link" href="javascript:;">+ Licensing / Citation</a></div><div class="collapsible-block-unfolded" style="display:none"><div class="collapsible-block-unfolded-link"><a class="collapsible-block-link" href="javascript:;">- Licensing / Citation</a></div><div class="collapsible-block-content"><p><strong>Cite this page as:</strong></p><blockquote><p>"Unfinished Business" by qntm, from the SCP Wiki. Licensed under CC-BY-SA.</p></blockquote></div></div></div></div>
<p>For information on how to use this component, see the <a href="/component:license-box">License Box component</a>. To read about licensing content, visit the <a href="/licensing-guide">Licensing Guide</a>.</p>
<div class="content-separator" style="display: none:"></div>
<script type="text/javascript">WIKIREQUEST.info.pageId = 1;</script>
</div>
<div class="page-tags"><span><a href="/system:page-tags/tag/antimemetics-division#pages">antimemetics-division</a><a href="/system:page-tags/tag/tale#pages">tale</a></span></div>
<div id="license-area" class="license-area">Unless otherwise stated, the content of this page is licensed under <a rel="license" href="http://creativecommons.org/licenses/by-sa/3.0/">Creative Commons Attribution-ShareAlike 3.0 License</a></div>
</div></body></html>`;

describe("parseTalePage", () => {
  it("keeps the story, lifts the byline, unwraps collapsibles and drops wiki chrome", () => {
    const p = parseTalePage(PAGE)!;
    expect(p.bylineAuthor).toBe("qntm");
    expect(p.imageUrls).toEqual([IMG, "https://scp-wiki.wdfiles.com/local--files/unfinished-business/old.jpg"]);
    expect(p.bodyHtml).not.toContain("avatar.php");
    expect(p.bodyHtml).toContain(`src="${IMG}"`);
    expect(p.bodyHtml).toContain('href="https://scp-wiki.wikidot.com/scp-055"');
    expect(p.bodyHtml).toContain("The memo says nothing.");
    expect(p.bodyHtml).toContain("The counter");
    expect(p.bodyHtml).toContain("Footnotes");
    expect(p.bodyHtml).toContain("Again.");
    expect(p.bodyHtml).not.toContain("+2110");
    expect(p.bodyHtml).not.toContain("rate-points");
    expect(p.bodyHtml).toContain("Login: E_Mann");
    expect(p.bodyHtml).not.toContain("I like it");
    expect(p.bodyHtml).not.toContain("qntm");
    expect(p.bodyHtml).not.toContain("Show the memo");
    expect(p.bodyHtml).not.toContain("Hide the memo");
    expect(p.bodyHtml).not.toContain("display:none");
    expect(p.bodyHtml).not.toContain("Cite this page");
    expect(p.bodyHtml).not.toContain("License Box component");
    expect(p.bodyHtml).not.toContain("WIKIREQUEST");
    expect(p.bodyHtml).not.toContain("antimemetics-division");
    expect(p.bodyHtml).not.toContain("Unless otherwise stated");
    expect(p.bodyHtml).not.toContain("javascript:");
    expect(p.intro).toBe("Marion Wheeler walks into the office and forgets.");
  });

  it("works without a byline or page-tags block", () => {
    const p = parseTalePage(`<div id="page-content"><p>Just text here, long enough to be a paragraph.</p></div>`)!;
    expect(p.bylineAuthor).toBe("");
    expect(p.bodyHtml).toContain("Just text here");
  });

  it("returns null when there is no page-content", () => {
    expect(parseTalePage("<html><body>nope</body></html>")).toBeNull();
  });
});
