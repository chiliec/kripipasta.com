import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]) },
}));

import { GET } from "./route";
import { prisma } from "@/lib/db";

describe("GET /api/health", () => {
  it("returns ok:true when the database responds", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it("returns ok:false with status 503 when the database fails", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("DB down"));
    const res = await GET();
    const body = await res.json();
    expect(body).toEqual({ ok: false });
    expect(res.status).toBe(503);
  });
});
