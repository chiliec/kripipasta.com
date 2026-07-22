import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]) },
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns ok:true when the database responds", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });
});
