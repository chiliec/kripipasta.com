import { describe, it, expect } from "vitest";
import {
  paragraphsHtml,
  editorNoteHtml,
  blockquoteHtml,
  definitionListHtml,
  timelineHtml,
  referencesHtml,
} from "@/seed/dossier-html";

describe("seed html transforms", () => {
  it("wraps and escapes paragraphs", () => {
    expect(paragraphsHtml(["a & b", "  ", "c"])).toBe("<p>a &amp; b</p><p>c</p>");
  });

  it("builds an editor note", () => {
    expect(editorNoteHtml("NOTE", "text")).toBe(
      '<aside class="editor-note"><span class="editor-note__label">NOTE</span><p>text</p></aside>',
    );
  });

  it("builds a blockquote with footer", () => {
    expect(blockquoteHtml("q", "src")).toBe(
      "<blockquote><p>q</p><footer>src</footer></blockquote>",
    );
  });

  it("builds a definition list", () => {
    expect(definitionListHtml([{ t: "A", x: "b" }])).toBe(
      "<dl><dt>A</dt><dd>b</dd></dl>",
    );
  });

  it("builds a timeline ordered list", () => {
    expect(timelineHtml([{ t: "2005", b: "built" }])).toBe(
      '<ol class="timeline"><li><strong>2005</strong><span>built</span></li></ol>',
    );
  });

  it("builds a references list", () => {
    expect(referencesHtml(["one", "two"])).toBe(
      '<ol class="refs"><li>one</li><li>two</li></ol>',
    );
  });
});
