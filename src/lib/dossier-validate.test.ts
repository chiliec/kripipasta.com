import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/sanitize", () => ({
  sanitizeStoryHtml: (s: string) => s.replace(/<script>.*<\/script>/g, ""),
}));

import { validateDossier, parseRelatedLines } from "@/lib/dossier-validate";

function form(over: Record<string, unknown> = {}) {
  return {
    name: "The Rake",
    slug: "",
    epithet: "",
    category: "Cryptids",
    canonStatus: "Community",
    aliases: "Hminnu, Pale One",
    threatLevel: "SEVERE",
    threatScore: "82",
    dangerScore: "74",
    firstSurfaced: "2005",
    origin: "N. America",
    lead: "A gaunt figure.",
    species: "Humanoid",
    statusText: "Active",
    creator: "Collaborative",
    height: "~6 ft",
    habitat: "Bedrooms",
    popularityCaption: "Indexed to 100.",
    sectionHeading: ["Overview"],
    sectionBody: ["<p>text</p><script>bad()</script>"],
    galleryCaption: ["portrait"],
    popYear: ["2005"],
    popValue: ["22"],
    relatedLines: "slender-man|Slender Man|Conflated|88",
    ...over,
  };
}

describe("validateDossier", () => {
  it("accepts valid input and derives a slug from the name", () => {
    const r = validateDossier(form());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.slug).toBe("the-rake");
    expect(r.data.threatScore).toBe(82);
    expect(r.data.aliases).toEqual(["Hminnu", "Pale One"]);
    expect(r.data.sections[0]).toEqual({
      anchor: "overview",
      heading: "Overview",
      bodyHtml: "<p>text</p>",
    });
    expect(r.data.popularity).toEqual([{ year: 2005, value: 22 }]);
    expect(r.data.related).toEqual([
      { targetSlug: "slender-man", name: "Slender Man", rel: "Conflated", threat: 88 },
    ]);
  });

  it("honours an explicit slug", () => {
    const r = validateDossier(form({ slug: "custom-slug" }));
    expect(r.ok && r.data.slug).toBe("custom-slug");
  });

  it("rejects an empty name", () => {
    const r = validateDossier(form({ name: "  " }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.name).toBeTruthy();
  });

  it("rejects an invalid threat level", () => {
    const r = validateDossier(form({ threatLevel: "NOPE" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.threatLevel).toBeTruthy();
  });

  it("clamps threat/danger scores to 0–100 and coerces bad numbers to 0", () => {
    const r = validateDossier(form({ threatScore: "250", dangerScore: "x" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.threatScore).toBe(100);
    expect(r.data.dangerScore).toBe(0);
  });

  it("drops section rows with an empty heading", () => {
    const r = validateDossier(
      form({ sectionHeading: ["Overview", "  "], sectionBody: ["<p>a</p>", "<p>b</p>"] }),
    );
    expect(r.ok && r.data.sections.length).toBe(1);
  });
});

describe("parseRelatedLines", () => {
  it("parses pipe-delimited lines and skips malformed ones", () => {
    expect(parseRelatedLines("a|A|rel|10\nbad-line\nb|B|rel2|20")).toEqual([
      { targetSlug: "a", name: "A", rel: "rel", threat: 10 },
      { targetSlug: "b", name: "B", rel: "rel2", threat: 20 },
    ]);
  });
});
