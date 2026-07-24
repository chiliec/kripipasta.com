import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { resolveLegacyRedirect } from "@/lib/legacy-redirect";
import redirectMap from "../data/legacy-redirects.json";

const handleI18n = createMiddleware(routing);

// Build the numeric-keyed lookup once at module load (edge-safe: JSON only).
const approvedSlugById = new Map<number, string>(
  Object.entries(redirectMap as Record<string, string>).map(([id, slug]) => [
    Number(id),
    slug,
  ]),
);

const GONE_HTML = `<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>История удалена</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#141418;color:#c8c8d0;font-family:Georgia,serif;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:2rem}
h1{color:#B85450;font-size:1.75rem;margin-bottom:1rem}
p{margin-bottom:1.5rem;line-height:1.6;opacity:.8}
a{color:#B85450;text-decoration:none}
a:hover{text-decoration:underline}
</style></head>
<body>
<div>
<h1>История удалена</h1>
<p>Эта страница больше не существует.<br>Возможно, материал был удалён или никогда не был опубликован.</p>
<a href="/ru">← На главную</a>
</div>
</body>
</html>`;

function goneResponse(): NextResponse {
  return new NextResponse(GONE_HTML, {
    status: 410,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default function proxy(req: NextRequest) {
  const res = resolveLegacyRedirect(req.nextUrl.pathname, approvedSlugById);
  if (res.kind === "redirect") {
    return NextResponse.redirect(new URL(res.location, req.url), res.status);
  }
  if (res.kind === "gone") {
    return goneResponse();
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
