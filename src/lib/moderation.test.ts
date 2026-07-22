import { describe, it, expect, vi, beforeEach } from "vitest";

const { findMany, count, findFirst, update } = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  prisma: { story: { findMany, count, findFirst, update } },
}));

import {
  getPendingStories,
  getPendingCount,
  setStoryStatus,
} from "./moderation";

beforeEach(() => {
  findMany.mockReset();
  count.mockReset();
  findFirst.mockReset();
  update.mockReset();
});

describe("getPendingStories", () => {
  it("queries PENDING newest-first and maps tags", async () => {
    findMany.mockResolvedValueOnce([
      {
        id: "1",
        slug: "s",
        title: "T",
        intro: "",
        authorName: "",
        createdAt: new Date(),
        legacyId: null,
        tags: [{ tag: { slug: "les", name: "Лес" } }],
      },
    ]);
    count.mockResolvedValueOnce(1);

    const { items, total } = await getPendingStories({ source: "new" });
    expect(total).toBe(1);
    expect(items[0].tags).toEqual([{ slug: "les", name: "Лес" }]);

    const where = findMany.mock.calls[0][0].where;
    expect(where.status).toBe("PENDING");
    expect(where.legacyId).toEqual(null);
    expect(findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: "desc" });
  });

  it("omits the legacyId filter for source=all", async () => {
    findMany.mockResolvedValueOnce([]);
    count.mockResolvedValueOnce(0);
    await getPendingStories({ source: "all" });
    expect(findMany.mock.calls[0][0].where.legacyId).toBeUndefined();
  });
});

describe("getPendingCount", () => {
  it("counts PENDING rows", async () => {
    count.mockResolvedValueOnce(42);
    expect(await getPendingCount("all")).toBe(42);
  });
});

describe("setStoryStatus", () => {
  it("stamps approvedAt on APPROVE", async () => {
    update.mockResolvedValueOnce({ slug: "s" });
    await setStoryStatus("1", "APPROVED");
    expect(update.mock.calls[0][0].data.status).toBe("APPROVED");
    expect(update.mock.calls[0][0].data.approvedAt).toBeInstanceOf(Date);
  });

  it("nulls approvedAt on REJECT", async () => {
    update.mockResolvedValueOnce({ slug: "s" });
    await setStoryStatus("1", "REJECTED");
    expect(update.mock.calls[0][0].data.approvedAt).toBeNull();
  });

  it("returns null when the story is not PENDING (P2025)", async () => {
    const err = Object.assign(new Error("not found"), { code: "P2025" });
    update.mockRejectedValueOnce(err);
    expect(await setStoryStatus("1", "APPROVED")).toBeNull();
  });
});
