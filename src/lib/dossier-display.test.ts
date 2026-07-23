import { describe, it, expect } from "vitest";
import {
  threatLevelKey,
  buildDossierToc,
  dossierScore100,
} from "@/lib/dossier-display";
import type { DossierDetail } from "@/lib/dossiers";

function base(over: Partial<DossierDetail> = {}): DossierDetail {
  return {
    id: "d1", slug: "the-rake", name: "The Rake", epithet: "", category: "",
    threatLevel: "SEVERE", heroImage: "", likeCount: 0, dislikeCount: 0, score: 0.9,
    aliases: [], canonStatus: "", firstSurfaced: 2005, origin: "", lead: "",
    threatScore: 82, dangerScore: 74, species: "", statusText: "", creator: "",
    height: "", habitat: "", popularityCaption: "", language: "ru",
    sections: [
      { anchor: "overview", heading: "Обзор", bodyHtml: "<p>a</p>", order: 0 },
      { anchor: "origin", heading: "История происхождения", bodyHtml: "<p>b</p>", order: 1 },
    ],
    gallery: [], popularity: [], related: [],
    ...over,
  };
}

describe("threatLevelKey", () => {
  it("maps enum values to keys", () => {
    expect(threatLevelKey("LOW")).toBe("threatLow");
    expect(threatLevelKey("MODERATE")).toBe("threatModerate");
    expect(threatLevelKey("HIGH")).toBe("threatHigh");
    expect(threatLevelKey("SEVERE")).toBe("threatSevere");
    expect(threatLevelKey("EXTREME")).toBe("threatExtreme");
  });
});

describe("dossierScore100", () => {
  it("scales Wilson score to /100 integer", () => {
    expect(dossierScore100(0.91)).toBe(91);
    expect(dossierScore100(0)).toBe(0);
  });
});

describe("buildDossierToc", () => {
  it("lists prose sections in order with empty labelKey", () => {
    const toc = buildDossierToc(base());
    expect(toc).toEqual([
      { anchor: "overview", labelKey: "" },
      { anchor: "origin", labelKey: "" },
    ]);
  });

  it("inserts gallery / popularity / related blocks when present", () => {
    const toc = buildDossierToc(
      base({
        gallery: [{ image: "", caption: "c", order: 0 }],
        popularity: [{ year: 2005, value: 10 }],
        related: [{ targetSlug: "x", name: "X", rel: "r", threat: 1 }],
      }),
    );
    expect(toc.map((b) => b.anchor)).toEqual([
      "overview",
      "origin",
      "gallery",
      "popularity",
      "related",
    ]);
    expect(toc.find((b) => b.anchor === "gallery")?.labelKey).toBe("tocGallery");
    expect(toc.find((b) => b.anchor === "popularity")?.labelKey).toBe("tocPopularity");
    expect(toc.find((b) => b.anchor === "related")?.labelKey).toBe("tocRelated");
  });

  it("omits empty special blocks", () => {
    const toc = buildDossierToc(base({ gallery: [], popularity: [], related: [] }));
    expect(toc.some((b) => b.anchor === "gallery")).toBe(false);
  });
});
