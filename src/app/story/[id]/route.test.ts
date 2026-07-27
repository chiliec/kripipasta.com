import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { story: { findUnique: vi.fn() } },
}));

import { NextRequest } from "next/server";
import { GET } from "./route";
import { prisma } from "@/lib/db";

// The route only reads { slug, status }; type the mock loosely so tests can
// return that partial select instead of a full Story row.
const findUnique = prisma.story.findUnique as unknown as ReturnType<
  typeof vi.fn
>;

function get(pathname: string) {
  return GET(new NextRequest(new URL(pathname, "https://kripipasta.com")));
}

describe("GET /story/[id]", () => {
  beforeEach(() => findUnique.mockReset());

  it("301-redirects an APPROVED legacy id to its /ru slug", async () => {
    findUnique.mockResolvedValue({ slug: "smile-dog", status: "APPROVED" });

    const res = await get("/story/1-smile-dog.html");

    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(
      "https://kripipasta.com/ru/story/smile-dog",
    );
    expect(res.headers.get("cache-control")).toContain("max-age=3600");
    expect(findUnique).toHaveBeenCalledWith({
      where: { legacyId: 1 },
      select: { slug: true, status: true },
    });
  });

  it("looks up by id even when the URL slug is wrong", async () => {
    findUnique.mockResolvedValue({ slug: "smile-dog", status: "APPROVED" });

    await get("/story/1-WRONG.html");

    expect(findUnique).toHaveBeenCalledWith({
      where: { legacyId: 1 },
      select: { slug: true, status: true },
    });
  });

  it("410s a PENDING story", async () => {
    findUnique.mockResolvedValue({ slug: "hidden", status: "PENDING" });

    const res = await get("/story/5-hidden.html");

    expect(res.status).toBe(410);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("410s an unknown legacy id", async () => {
    findUnique.mockResolvedValue(null);

    const res = await get("/story/999-nope.html");

    expect(res.status).toBe(410);
  });

  it("410s an unparseable id without touching the DB", async () => {
    const res = await get("/story/abc.html");

    expect(res.status).toBe(410);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
