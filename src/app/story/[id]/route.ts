import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { parseLegacyStoryId } from "@/lib/legacy-redirect";
import { goneResponse } from "@/lib/legacy-gone";

// Live DB lookup — must run on Node (Prisma) and never be prerendered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = parseLegacyStoryId(req.nextUrl.pathname);
  if (id === null) {
    return goneResponse();
  }

  const story = await prisma.story.findUnique({
    where: { legacyId: id },
    select: { slug: true, status: true },
  });

  if (story?.status === "APPROVED") {
    // Relative Location (path-only): the container binds 0.0.0.0:3000, so
    // resolving against req.url would leak that internal host into the redirect.
    // A relative reference is valid per RFC 7231 and resolves to the public host.
    return new Response(null, {
      status: 301,
      headers: {
        Location: `/ru/story/${story.slug}`,
        // Redirects are cheap to cache; keep crawler load off the DB.
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Not found, PENDING, or REJECTED → themed 410 (no cache).
  return goneResponse();
}
