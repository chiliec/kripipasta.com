import { describe, it, expect } from "vitest";
import { stripMissingImages } from "./available-images";

// These assertions are tied to real files in public/images/: 90202-q.jpg was
// recovered from Wayback, 04890-2099883.jpg was never archived and is absent.
describe("stripMissingImages", () => {
  it("keeps img tags whose file exists under public/images", () => {
    const html = '<p>x</p><img src="/images/90202-q.jpg" />';
    expect(stripMissingImages(html)).toBe(html);
  });

  it("removes img tags whose /images file is missing", () => {
    const html = '<div><img src="/images/04890-2099883.jpg" /></div>';
    expect(stripMissingImages(html)).toBe("<div></div>");
  });

  it("leaves external images untouched", () => {
    const html = '<img src="https://example.com/a.jpg" />';
    expect(stripMissingImages(html)).toBe(html);
  });

  it("strips only the missing tag when both present and missing appear", () => {
    const html =
      '<img src="/images/04890-2099883.jpg" /><img src="/images/90202-q.jpg" />';
    expect(stripMissingImages(html)).toBe('<img src="/images/90202-q.jpg" />');
  });
});
