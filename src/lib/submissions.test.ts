import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique, create } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  prisma: { story: { findUnique, create } },
}));

import { generateUniqueSlug, createSubmission } from "./submissions";
import type { ValidatedSubmission } from "./submission-validate";

beforeEach(() => {
  findUnique.mockReset();
  create.mockReset();
});

describe("generateUniqueSlug", () => {
  it("returns the base slug when unused", async () => {
    findUnique.mockResolvedValueOnce(null);
    expect(await generateUniqueSlug("Полночный гость")).toBe("polnochnyy-gost");
  });

  it("appends an incrementing suffix on collision", async () => {
    findUnique
      .mockResolvedValueOnce({ id: "x" }) // base taken
      .mockResolvedValueOnce({ id: "y" }) // -2 taken
      .mockResolvedValueOnce(null); // -3 free
    expect(await generateUniqueSlug("Дом")).toBe("dom-3");
  });
});

describe("createSubmission", () => {
  const data: ValidatedSubmission = {
    title: "Дом",
    intro: "",
    contentHtml: "<p>hi<script>x</script></p>",
    authorName: "Аноним",
    authorLink: "",
    authorEmail: "",
    tagNames: ["Крипи", "крипи", "Лес"],
  };

  it("sanitizes content, sets PENDING, and connectOrCreates deduped tags", async () => {
    findUnique.mockResolvedValueOnce(null);
    create.mockResolvedValueOnce({ id: "story1", slug: "dom" });

    const out = await createSubmission(data);
    expect(out).toEqual({ id: "story1", slug: "dom" });

    const arg = create.mock.calls[0][0].data;
    expect(arg.status).toBe("PENDING");
    expect(arg.slug).toBe("dom");
    expect(arg.contentHtml).not.toContain("<script>");
    // "Крипи"/"крипи" collapse to one slug; "Лес" is the second
    expect(arg.tags.create).toHaveLength(2);
    expect(arg.tags.create[0].tag.connectOrCreate.where.slug).toBe("kripi");
  });
});
