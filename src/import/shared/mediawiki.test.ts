import { describe, it, expect } from "vitest";
import { apiUrl, mediawikiBody, parseCategoryMembers, parseFirstRevision } from "./mediawiki";

describe("apiUrl", () => {
  it("appends params and format=json", () => {
    expect(apiUrl("https://trollpasta.com/w/api.php", { action: "parse", pageid: "12" }))
      .toBe("https://trollpasta.com/w/api.php?action=parse&pageid=12&format=json");
  });
});

describe("mediawikiBody", () => {
  it("returns the inner mw-parser-output html without comments and headline spans", () => {
    const text = `<div class="mw-content-ltr mw-parser-output" lang="en"><h2><span class="mw-headline" id="Part_one">Part one</span></h2>\n<p>Hi</p>\n<!-- NewPP limit report -->\n</div>`;
    expect(mediawikiBody(text)).toBe("<h2>Part one</h2>\n<p>Hi</p>\n\n");
  });
  it("falls back to the whole text when the wrapper is missing", () => {
    expect(mediawikiBody("<p>x</p>")).toBe("<p>x</p>");
  });
});

describe("parseFirstRevision", () => {
  it("reads the single oldest revision", () => {
    const json = { query: { pages: { "36481": { pageid: 36481, revisions: [{ user: "CreepySpork", timestamp: "2012-03-08T15:17:40Z" }] } } } };
    expect(parseFirstRevision(json)).toEqual({ date: new Date("2012-03-08T15:17:40Z"), user: "CreepySpork" });
  });
  it("returns null when absent", () => {
    expect(parseFirstRevision({ query: { pages: { "-1": { missing: "" } } } })).toBeNull();
  });
});

describe("parseCategoryMembers", () => {
  it("lists members and the continuation token", () => {
    const json = {
      continue: { cmcontinue: "page|ABC|123", continue: "-||" },
      query: { categorymembers: [{ pageid: 1, ns: 0, title: "A" }, { pageid: 2, ns: 0, title: "B" }] },
    };
    expect(parseCategoryMembers(json)).toEqual({ members: [{ pageid: 1, title: "A" }, { pageid: 2, title: "B" }], next: "page|ABC|123" });
    expect(parseCategoryMembers({ query: { categorymembers: [] } })).toEqual({ members: [], next: null });
  });
});
