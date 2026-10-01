import { describe, it, expect } from "vitest";
import { localImageName, rewriteImageSrcs } from "./images";

describe("localImageName", () => {
  it("is deterministic, prefixed, and keeps a lowercase extension", () => {
    const a = localImageName("https://mrakopedia.net/w/images/1/1a/Scary.JPG", "mrakopedia");
    expect(a).toMatch(/^mrakopedia-[0-9a-f]{12}\.jpg$/);
    expect(localImageName("https://mrakopedia.net/w/images/1/1a/Scary.JPG", "mrakopedia")).toBe(a);
    expect(localImageName("https://mrakopedia.net/w/images/1/1a/Other.png", "mrakopedia")).not.toBe(a);
  });
  it("takes the extension from the last segment that has one (Fandom /revision/latest URLs)", () => {
    expect(
      localImageName("https://static.wikia.nocookie.net/creepypasta/images/6/6c/Dragon-tattoo-1.gif/revision/latest", "creepypasta"),
    ).toMatch(/^creepypasta-[0-9a-f]{12}\.gif$/);
  });
  it("falls back to .bin without an extension", () => {
    expect(localImageName("https://mrakopedia.net/w/images/1/1a/noext", "mrakopedia")).toMatch(/\.bin$/);
  });
});

describe("rewriteImageSrcs", () => {
  it("replaces mapped srcs and leaves others alone", () => {
    const html = '<p><img src="https://mrakopedia.net/w/images/1/1a/A.png" alt="a" /><img src="https://x.test/b.png" /></p>';
    const map = new Map([["https://mrakopedia.net/w/images/1/1a/A.png", "/images/mrakopedia-abc.png"]]);
    expect(rewriteImageSrcs(html, map)).toBe(
      '<p><img src="/images/mrakopedia-abc.png" alt="a" /><img src="https://x.test/b.png" /></p>',
    );
  });
});
