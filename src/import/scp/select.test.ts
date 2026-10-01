import { describe, it, expect } from "vitest";
import { cromBody, excludedTag, parseCromPage, tagNames, taleUrl, votesFromRating } from "./select";

describe("cromBody", () => {
  it("filters tales by rating, sorts by rating desc, pages with after", () => {
    const first = JSON.parse(cromBody(100, null));
    expect(first.query).toContain('tags: {eq: "tale"}');
    expect(first.query).toContain("rating: {gte: 100}");
    expect(first.query).toContain("sort: {key: RATING, order: DESC}");
    expect(first.query).not.toContain("after:");
    expect(JSON.parse(cromBody(100, "abc=")).query).toContain('after: "abc="');
  });
});

describe("parseCromPage", () => {
  const json = {
    data: {
      pages: {
        pageInfo: { hasNextPage: true, endCursor: "cur2" },
        edges: [
          {
            node: {
              url: "http://scp-wiki.wikidot.com/unfinished-business",
              wikidotInfo: { title: "Unfinished Business", rating: 2110, voteCount: 2200, tags: ["tale", "antimemetics-division", "horror"], createdAt: "2015-04-05T18:42:00.000Z", wikidotId: 12345 },
              attributions: [{ type: "SUBMITTER", user: { name: "qntm" } }],
            },
          },
          {
            node: {
              url: "http://scp-wiki.wikidot.com/rewritten",
              wikidotInfo: { title: "Rewritten", rating: 150, voteCount: 180, tags: ["tale"], createdAt: "2012-01-01T00:00:00.000Z", wikidotId: 7 },
              attributions: [{ type: "SUBMITTER", user: { name: "poster" } }, { type: "AUTHOR", user: { name: "Real Author" } }],
            },
          },
          { node: { url: "http://scp-wiki.wikidot.com/broken" } },
        ],
      },
    },
  };
  it("maps nodes, prefers AUTHOR over SUBMITTER, skips malformed nodes, returns the cursor", () => {
    const page = parseCromPage(json);
    expect(page.next).toBe("cur2");
    expect(page.tales).toHaveLength(2);
    expect(page.tales[0]).toEqual({
      url: "http://scp-wiki.wikidot.com/unfinished-business", title: "Unfinished Business", rating: 2110, voteCount: 2200,
      tags: ["tale", "antimemetics-division", "horror"], createdAt: new Date("2015-04-05T18:42:00.000Z"), wikidotId: 12345, author: "qntm",
    });
    expect(page.tales[1].author).toBe("Real Author");
  });
  it("returns no cursor on the last page and tolerates errors", () => {
    expect(parseCromPage({ data: { pages: { pageInfo: { hasNextPage: false, endCursor: "x" }, edges: [] } } })).toEqual({ tales: [], next: null });
    expect(parseCromPage({ errors: [{ message: "bad" }] })).toEqual({ tales: [], next: null });
  });
});

describe("taleUrl", () => {
  it("upgrades Crom's http URL to https", () => {
    expect(taleUrl("http://scp-wiki.wikidot.com/unfinished-business")).toBe("https://scp-wiki.wikidot.com/unfinished-business");
  });
});

describe("votesFromRating", () => {
  it("splits net rating + vote count into likes/dislikes", () => {
    expect(votesFromRating(417, 523)).toMatchObject({ likes: 470, dislikes: 53 });
    expect(votesFromRating(417, 523).score).toBeGreaterThan(votesFromRating(100, 200).score);
  });
  it("never goes negative on inconsistent data", () => {
    expect(votesFromRating(100, 0)).toMatchObject({ likes: 50, dislikes: 0 });
  });
});

describe("tags", () => {
  it("flags adult/hub/poetry", () => {
    expect(excludedTag(["tale", "adult"])).toBe("adult");
    expect(excludedTag(["tale", "horror"])).toBeNull();
  });
  it("always tags SCP Foundation and maps genre tags only", () => {
    expect(tagNames(["tale", "antimemetics-division", "horror", "science-fiction", "_licensebox", "featured"]))
      .toEqual(["SCP Foundation", "Horror", "Science Fiction"]);
  });
});
