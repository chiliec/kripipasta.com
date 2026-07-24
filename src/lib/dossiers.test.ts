import { describe, it, expect, vi, beforeEach } from "vitest";

const { findFirst, findMany } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { dossier: { findFirst, findMany } },
}));

import {
  getPublishedDossierBySlug,
  getPublishedDossiers,
  getAllPublishedDossierSlugs,
} from "@/lib/dossiers";

beforeEach(() => {
  findFirst.mockReset();
  findMany.mockReset();
});

const row = {
  id: "d1",
  slug: "the-rake",
  name: "The Rake",
  epithet: "The Pale Watcher",
  category: "Криптиды",
  canonStatus: "Сообщество",
  aliases: ["Hminnu"],
  threatLevel: "SEVERE",
  threatScore: 82,
  dangerScore: 74,
  firstSurfaced: 2005,
  origin: "Сев. Америка",
  heroImage: "",
  lead: "Худой бледный гуманоид…",
  species: "Гуманоид",
  statusText: "Активен",
  creator: "Коллективный",
  height: "~1,8 м",
  habitat: "Сельские спальни",
  popularityCaption: "Индекс 100.",
  language: "ru",
  likeCount: 2841,
  dislikeCount: 137,
  score: 0.91,
  related: [{ targetSlug: "slender-man", name: "Slender Man", rel: "Часто путают", threat: 88 }],
  sections: [{ anchor: "overview", heading: "Обзор", bodyHtml: "<p>…</p>", order: 0 }],
  gallery: [{ image: "", caption: "портрет", order: 0 }],
  popularity: [{ year: 2005, value: 22 }],
};

describe("getPublishedDossierBySlug", () => {
  it("returns a mapped detail with parsed related list", async () => {
    findFirst.mockResolvedValue(row);
    const d = await getPublishedDossierBySlug("the-rake");
    expect(d?.name).toBe("The Rake");
    expect(d?.related).toEqual([
      { targetSlug: "slender-man", name: "Slender Man", rel: "Часто путают", threat: 88 },
    ]);
    expect(d?.sections[0].anchor).toBe("overview");
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: "the-rake", status: "APPROVED" } }),
    );
  });

  it("returns null when not found", async () => {
    findFirst.mockResolvedValue(null);
    expect(await getPublishedDossierBySlug("nope")).toBeNull();
  });

  it("coerces a malformed related column to []", async () => {
    findFirst.mockResolvedValue({ ...row, related: "garbage" });
    const d = await getPublishedDossierBySlug("the-rake");
    expect(d?.related).toEqual([]);
  });
});

describe("getPublishedDossiers", () => {
  it("maps list items ordered by score", async () => {
    findMany.mockResolvedValue([row]);
    const list = await getPublishedDossiers();
    expect(list[0].slug).toBe("the-rake");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "APPROVED" } }),
    );
  });
});

describe("getAllPublishedDossierSlugs", () => {
  it("returns slug strings", async () => {
    findMany.mockResolvedValue([{ slug: "the-rake" }, { slug: "slender-man" }]);
    expect(await getAllPublishedDossierSlugs()).toEqual(["the-rake", "slender-man"]);
  });
});
