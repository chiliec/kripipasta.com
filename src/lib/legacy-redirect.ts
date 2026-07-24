export type LegacyResolution =
  | { kind: "redirect"; location: string; status: 301 }
  | { kind: "gone"; status: 410 }
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

const STORY_RE = /^\/story\/(\d+)(?:-[^/]*)?(?:\.html)?$/;

/**
 * Decide what to do with a raw request pathname (no query string, no origin).
 * Query strings must be stripped by the caller before passing pathname.
 */
export function resolveLegacyRedirect(
  pathname: string,
  approvedSlugById: ReadonlyMap<number, string>,
): LegacyResolution {
  // Normalize: strip trailing slash (but keep root "/")
  let p = pathname;
  if (p.length > 1 && p.endsWith("/")) {
    p = p.slice(0, -1);
  }

  const lower = p.toLowerCase();

  // Exact: /go.php
  if (lower === "/go.php") {
    return { kind: "redirect", location: "/ru", status: 301 };
  }

  // Story paths: /story or /story/...
  if (lower === "/story" || lower.startsWith("/story/")) {
    const m = lower.match(STORY_RE);
    if (m) {
      const id = Number(m[1]);
      const slug = approvedSlugById.get(id);
      if (slug !== undefined) {
        return { kind: "redirect", location: `/ru/story/${slug}`, status: 301 };
      }
    }
    return { kind: "gone", status: 410 };
  }

  // Non-story legacy sections: match on the first path segment
  const firstSegment = lower.split("/")[1] ?? "";
  if (LEGACY_SECTIONS.has(firstSegment)) {
    return { kind: "redirect", location: "/ru", status: 301 };
  }

  return { kind: "passthrough" };
}
