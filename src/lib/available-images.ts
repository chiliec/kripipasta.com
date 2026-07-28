import { readdirSync } from "node:fs";
import { join } from "node:path";

// Legacy stories reference images by site-absolute path (/images/<name>). The
// files were recovered from the Wayback Machine into public/images/, but a few
// were never archived and stay missing. Rather than hardcode that gap, we strip
// <img> tags at render time whenever the target file isn't present — so a story
// shows no broken-image icon, and the image reappears automatically if the file
// is later dropped into public/images/.

const IMAGES_DIR = join(process.cwd(), "public", "images");
const IMG_TAG_RE = /<img\b[^>]*>/gi;
const SRC_RE = /\bsrc\s*=\s*["']([^"']+)["']/i;

let cache: Set<string> | null = null;

/** Site-absolute paths of files under public/images ("/images/foo.jpg"). Read once per process. */
function availableImages(): Set<string> {
  if (cache) return cache;
  const set = new Set<string>();
  try {
    for (const name of readdirSync(IMAGES_DIR)) set.add(`/images/${name}`);
  } catch {
    // Directory absent (e.g. a DB-less build) → treat everything as missing.
  }
  cache = set;
  return set;
}

/**
 * True when `src` is safe to render: an external URL, or a `/images/*` path
 * whose file is present under public/images. Empty/missing local files → false,
 * so callers can fall back to a placeholder instead of a broken image.
 */
export function imageExists(src: string): boolean {
  if (!src) return false;
  if (!src.startsWith("/images/")) return true; // external / other paths
  return availableImages().has(src);
}

/**
 * Remove `<img>` tags whose `/images/*` file is not present under public/images.
 * External images and locally-present images are left untouched.
 */
export function stripMissingImages(html: string): string {
  const available = availableImages();
  return html.replace(IMG_TAG_RE, (tag) => {
    const src = tag.match(SRC_RE)?.[1] ?? "";
    if (src.startsWith("/images/") && !available.has(src)) return "";
    return tag;
  });
}
