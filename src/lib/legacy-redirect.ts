export type StaticLegacyResolution =
  | { kind: "redirect"; location: string; status: 301 }
  | { kind: "passthrough" };

const LEGACY_SECTIONS = new Set([
  "sandbox",
  "forum",
  "film",
  "deep",
  "video",
  "image",
  "kurdstory",
]);

export const STORY_RE = /^\/story\/(\d+)(?:-[^/]*)?(?:\.html)?$/;

/** Normalize a raw pathname: strip a trailing slash (keep root "/") and lowercase. */
function normalize(pathname: string): string {
  let p = pathname;
  if (p.length > 1 && p.endsWith("/")) {
    p = p.slice(0, -1);
  }
  return p.toLowerCase();
}

/** True for legacy story paths (`/story` or `/story/...`). Edge-safe, no DB. */
export function isLegacyStoryPath(pathname: string): boolean {
  const lower = normalize(pathname);
  return lower === "/story" || lower.startsWith("/story/");
}

/**
 * Parse the numeric legacy id out of a `/story/{id}` pathname. Handles `123`,
 * `123-slug`, and `123-slug.html` (plus an optional trailing slash). Returns null
 * for bare `/story`, non-numeric ids, or anything that isn't a story path.
 * Pure — used by the Node route to look the id up live in the DB.
 */
export function parseLegacyStoryId(pathname: string): number | null {
  const m = normalize(pathname).match(STORY_RE);
  return m ? Number(m[1]) : null;
}

/**
 * Resolve the *static* legacy rules that need no DB: `/go.php` and the old
 * section trees (`/sandbox`, `/forum`, …) all 301 to `/ru`. Story paths and
 * everything else pass through. Query strings must be stripped by the caller.
 * Pure and edge-safe.
 */
export function resolveStaticLegacy(pathname: string): StaticLegacyResolution {
  const lower = normalize(pathname);

  // Exact: /go.php
  if (lower === "/go.php") {
    return { kind: "redirect", location: "/ru", status: 301 };
  }

  // Non-story legacy sections: match on the first path segment
  const firstSegment = lower.split("/")[1] ?? "";
  if (LEGACY_SECTIONS.has(firstSegment)) {
    return { kind: "redirect", location: "/ru", status: 301 };
  }

  return { kind: "passthrough" };
}
