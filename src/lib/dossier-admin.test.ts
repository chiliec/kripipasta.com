import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: { dossier: { findUnique } },
}));

import { generateUniqueDossierSlug } from "@/lib/dossier-admin";

beforeEach(() => findUnique.mockReset());

describe("generateUniqueDossierSlug", () => {
  it("returns the base slug when free", async () => {
    findUnique.mockResolvedValue(null);
    expect(await generateUniqueDossierSlug("The Rake")).toBe("the-rake");
  });

  it("appends a counter when taken", async () => {
    findUnique
      .mockResolvedValueOnce({ id: "x" })
      .mockResolvedValueOnce({ id: "y" })
      .mockResolvedValueOnce(null);
    expect(await generateUniqueDossierSlug("The Rake")).toBe("the-rake-3");
  });

  it("treats the excepted id as free (editing own row)", async () => {
    findUnique.mockResolvedValue({ id: "self" });
    expect(await generateUniqueDossierSlug("The Rake", "self")).toBe("the-rake");
  });
});
