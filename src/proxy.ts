import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { isLegacyStoryPath, resolveStaticLegacy } from "@/lib/legacy-redirect";

const handleI18n = createMiddleware(routing);

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Legacy `/story/{id}` redirects need a live DB lookup, so they're owned by the
  // Node route at src/app/story/[id]/route.ts. Pass through untouched — crucially
  // WITHOUT running handleI18n, which (localePrefix: "always") would 307
  // /story/123 → /ru/story/123 before the route ever sees it.
  if (isLegacyStoryPath(pathname)) {
    return NextResponse.next();
  }

  // Static legacy rules (no DB): /go.php + old section trees → 301 /ru.
  const res = resolveStaticLegacy(pathname);
  if (res.kind === "redirect") {
    return NextResponse.redirect(new URL(res.location, req.url), res.status);
  }

  return handleI18n(req);
}

export const config = {
  matcher: [
    // App routes (unchanged behavior for i18n). `icon`/`apple-icon` are
    // root-level generated metadata routes with no locale prefix — exclude them
    // so next-intl doesn't 404 them by redirecting to /<locale>/icon.
    "/((?!api|_next|_vercel|icon|apple-icon|.*\\..*).*)",
    // Legacy paths (have .html / .php extensions the above excludes).
    "/story/:path*",
    "/sandbox/:path*",
    "/forum/:path*",
    "/film/:path*",
    "/deep/:path*",
    "/video/:path*",
    "/image/:path*",
    "/kurdstory/:path*",
    "/go.php",
  ],
};
