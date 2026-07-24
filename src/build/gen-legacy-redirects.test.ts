import { describe, it, expect } from "vitest";
import { resolveLegacyRedirect } from "@/lib/legacy-redirect";
import redirectMap from "../../data/legacy-redirects.json";

const approvedSlugById = new Map<number, string>(
  Object.entries(redirectMap as Record<string, string>).map(([id, slug]) => [
    Number(id),
    slug,
  ]),
);

describe("legacy-redirects.json wiring", () => {
  it("committed JSON wires up correctly — legacyId 1 redirects to /ru/story/smile-dog", () => {
    const result = resolveLegacyRedirect("/story/1-smile-dog.html", approvedSlugById);
    expect(result).toEqual({
      kind: "redirect",
      location: "/ru/story/smile-dog",
      status: 301,
    });
  });

  it("committed JSON has at least one entry", () => {
    expect(approvedSlugById.size).toBeGreaterThan(0);
  });

  it("any entry from the map resolves to a redirect", () => {
    const [firstId, firstSlug] = Object.entries(
      redirectMap as Record<string, string>,
    )[0]!;
    const result = resolveLegacyRedirect(
      `/story/${firstId}-test.html`,
      approvedSlugById,
    );
    expect(result).toEqual({
      kind: "redirect",
      location: `/ru/story/${firstSlug}`,
      status: 301,
    });
  });
});
