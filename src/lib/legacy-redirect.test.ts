import { describe, it, expect } from "vitest";
import { resolveLegacyRedirect } from "./legacy-redirect";

const map = new Map<number, string>([
  [1, "smile-dog"],
  [2, "koshki"],
  [3, "instinkt"],
]);

describe("resolveLegacyRedirect", () => {
  describe("approved story → 301 redirect", () => {
    it("handles standard .html URL", () => {
      expect(resolveLegacyRedirect("/story/1-smile-dog.html", map)).toEqual({
        kind: "redirect",
        location: "/ru/story/smile-dog",
        status: 301,
      });
    });

    it("handles URL without .html extension", () => {
      expect(resolveLegacyRedirect("/story/2-koshki", map)).toEqual({
        kind: "redirect",
        location: "/ru/story/koshki",
        status: 301,
      });
    });

    it("handles trailing slash before/after .html", () => {
      expect(resolveLegacyRedirect("/story/2-koshki.html/", map)).toEqual({
        kind: "redirect",
        location: "/ru/story/koshki",
        status: 301,
      });
    });

    it("resolves by id even when URL slug differs from map slug", () => {
      expect(resolveLegacyRedirect("/story/1-WRONG.html", map)).toEqual({
        kind: "redirect",
        location: "/ru/story/smile-dog",
        status: 301,
      });
    });
  });

  describe("unapproved or unknown story → 410 Gone", () => {
    it("returns gone for id not in map", () => {
      expect(resolveLegacyRedirect("/story/999-whatever.html", map)).toEqual({
        kind: "gone",
        status: 410,
      });
    });

    it("returns gone for non-numeric id", () => {
      expect(resolveLegacyRedirect("/story/abc.html", map)).toEqual({
        kind: "gone",
        status: 410,
      });
    });

    it("returns gone for bare /story", () => {
      expect(resolveLegacyRedirect("/story", map)).toEqual({
        kind: "gone",
        status: 410,
      });
    });

    it("returns gone for /story/ (trailing slash)", () => {
      expect(resolveLegacyRedirect("/story/", map)).toEqual({
        kind: "gone",
        status: 410,
      });
    });
  });

  describe("legacy sections → 301 to /ru", () => {
    it("/sandbox", () => {
      expect(resolveLegacyRedirect("/sandbox", map)).toEqual({
        kind: "redirect",
        location: "/ru",
        status: 301,
      });
    });

    it("/forum/10-x.html", () => {
      expect(resolveLegacyRedirect("/forum/10-x.html", map)).toEqual({
        kind: "redirect",
        location: "/ru",
        status: 301,
      });
    });

    it("/film/page1.html", () => {
      expect(resolveLegacyRedirect("/film/page1.html", map)).toEqual({
        kind: "redirect",
        location: "/ru",
        status: 301,
      });
    });

    it("/deep/page3.html", () => {
      expect(resolveLegacyRedirect("/deep/page3.html", map)).toEqual({
        kind: "redirect",
        location: "/ru",
        status: 301,
      });
    });

    it("/kurdstory", () => {
      expect(resolveLegacyRedirect("/kurdstory", map)).toEqual({
        kind: "redirect",
        location: "/ru",
        status: 301,
      });
    });

    it("/go.php", () => {
      expect(resolveLegacyRedirect("/go.php", map)).toEqual({
        kind: "redirect",
        location: "/ru",
        status: 301,
      });
    });

    it("/video/foo", () => {
      expect(resolveLegacyRedirect("/video/foo", map)).toEqual({
        kind: "redirect",
        location: "/ru",
        status: 301,
      });
    });

    it("/image/bar.jpg", () => {
      expect(resolveLegacyRedirect("/image/bar.jpg", map)).toEqual({
        kind: "redirect",
        location: "/ru",
        status: 301,
      });
    });
  });

  describe("normal app paths → passthrough", () => {
    it("/", () => {
      expect(resolveLegacyRedirect("/", map)).toEqual({ kind: "passthrough" });
    });

    it("/ru", () => {
      expect(resolveLegacyRedirect("/ru", map)).toEqual({ kind: "passthrough" });
    });

    it("/en/story/foo", () => {
      expect(resolveLegacyRedirect("/en/story/foo", map)).toEqual({
        kind: "passthrough",
      });
    });

    it("/api/health", () => {
      expect(resolveLegacyRedirect("/api/health", map)).toEqual({
        kind: "passthrough",
      });
    });

    it("/some-new-page", () => {
      expect(resolveLegacyRedirect("/some-new-page", map)).toEqual({
        kind: "passthrough",
      });
    });
  });
});
