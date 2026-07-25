import { describe, it, expect } from "vitest";
import {
  isLegacyStoryPath,
  parseLegacyStoryId,
  resolveStaticLegacy,
} from "./legacy-redirect";

describe("parseLegacyStoryId", () => {
  it("parses a bare numeric id", () => {
    expect(parseLegacyStoryId("/story/123")).toBe(123);
  });

  it("parses id-slug", () => {
    expect(parseLegacyStoryId("/story/123-poka-ty-spal")).toBe(123);
  });

  it("parses id-slug.html", () => {
    expect(parseLegacyStoryId("/story/1-smile-dog.html")).toBe(1);
  });

  it("parses through a trailing slash", () => {
    expect(parseLegacyStoryId("/story/2-koshki.html/")).toBe(2);
  });

  it("ignores a mismatched slug, keying only on the id", () => {
    expect(parseLegacyStoryId("/story/1-WRONG.html")).toBe(1);
  });

  it("returns null for a non-numeric id", () => {
    expect(parseLegacyStoryId("/story/abc.html")).toBeNull();
  });

  it("returns null for bare /story", () => {
    expect(parseLegacyStoryId("/story")).toBeNull();
  });

  it("returns null for /story/ (trailing slash only)", () => {
    expect(parseLegacyStoryId("/story/")).toBeNull();
  });

  it("returns null for a non-story path", () => {
    expect(parseLegacyStoryId("/sandbox/123")).toBeNull();
  });
});

describe("isLegacyStoryPath", () => {
  it.each(["/story", "/story/", "/story/1-smile-dog.html", "/STORY/1"])(
    "is true for %s",
    (p) => expect(isLegacyStoryPath(p)).toBe(true),
  );

  it.each(["/", "/ru", "/en/story/foo", "/sandbox", "/go.php"])(
    "is false for %s",
    (p) => expect(isLegacyStoryPath(p)).toBe(false),
  );
});

describe("resolveStaticLegacy", () => {
  it("redirects /go.php → /ru", () => {
    expect(resolveStaticLegacy("/go.php")).toEqual({
      kind: "redirect",
      location: "/ru",
      status: 301,
    });
  });

  it.each([
    "/sandbox",
    "/forum/10-x.html",
    "/film/page1.html",
    "/deep/page3.html",
    "/video/foo",
    "/image/bar.jpg",
    "/kurdstory",
  ])("redirects legacy section %s → /ru", (p) => {
    expect(resolveStaticLegacy(p)).toEqual({
      kind: "redirect",
      location: "/ru",
      status: 301,
    });
  });

  it.each(["/", "/ru", "/en/story/foo", "/api/health", "/some-new-page"])(
    "passes through %s",
    (p) => expect(resolveStaticLegacy(p)).toEqual({ kind: "passthrough" }),
  );

  it("passes story paths through (owned by the Node route now)", () => {
    expect(resolveStaticLegacy("/story/1-smile-dog.html")).toEqual({
      kind: "passthrough",
    });
    expect(resolveStaticLegacy("/story")).toEqual({ kind: "passthrough" });
  });
});
