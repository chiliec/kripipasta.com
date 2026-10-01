import sanitizeHtml from "sanitize-html";
import { sanitizeStoryHtml } from "@/lib/sanitize";
import { excerpt, stripHtml } from "@/lib/story-display";
import { BASE_URL } from "./select";

export interface ParsedTale {
  bodyHtml: string;
  intro: string;
  /** From the right-aligned "by <author>" line under the rate widget; "" when absent. */
  bylineAuthor: string;
  /** Absolute wdfiles.com image URLs referenced by bodyHtml, deduped, document order. */
  imageUrls: string[];
}

const CONTENT_OPEN = '<div id="page-content">';
const TAGS_OPEN = '<div class="page-tags">';
// <div style="text-align: right; margin-right: 2em; margin-top: -20px;"><p>by <a href="/x-s-author-page">x</a></p></div>
const BYLINE_RE = /<div style="text-align: right;[^"]*">\s*<p>\s*(?:by|written by)\s+(?:<a[^>]*>)?([^<]{1,80}?)(?:<\/a>)?\s*(?:<br\s*\/?>[\s\S]*?)?<\/p>\s*<\/div>/i;
const DROP_CLASS_RE = /\b(page-rate-widget-box|licensebox|creditRate|info-container|footer-wikiwalk-nav|heritage-rating-module|collapsible-block-folded|collapsible-block-unfolded-link|content-separator|page-tags)\b/;
const CSS_RULE_RE = /\{[^{}]*?[-\w]+\s*:[^{};]*;/;
const DROP_TAGS = new Set(["script", "style", "iframe", "form", "input", "svg"]);

function absolutize(url: string): string {
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return url;
}

/** Wikidot serves `<site>.wikidot.com/local--files/…` as a redirect to `<site>.wdfiles.com/local--files/…`; old pages use http. */
function imageSrc(src: string): string {
  return absolutize(src)
    .replace(/^http:\/\//, "https://")
    .replace(/^https:\/\/([\w-]+)\.wikidot\.com\/local--files\//, "https://$1.wdfiles.com/local--files/");
}

/** Story HTML from a wikidot tale page. Null when #page-content is missing (redirect/error page). */
export function parseTalePage(html: string): ParsedTale | null {
  const start = html.indexOf(CONTENT_OPEN);
  if (start < 0) return null;
  const from = start + CONTENT_OPEN.length;
  const tagsAt = html.indexOf(TAGS_OPEN, from);
  let body = html.slice(from, tagsAt >= 0 ? tagsAt : undefined).replace(/<!--[\s\S]*?-->/g, "");

  let bylineAuthor = "";
  const byline = body.match(BYLINE_RE);
  if (byline) {
    bylineAuthor = stripHtml(byline[1]);
    body = body.replace(BYLINE_RE, "");
  }

  const imageUrls: string[] = [];
  const cleaned = sanitizeHtml(body, {
    allowedTags: false,
    allowedAttributes: false,
    allowVulnerableTags: true, // transform pass only; sanitizeStoryHtml() runs before storage
    exclusiveFilter: (frame) => {
      if (DROP_TAGS.has(frame.tag)) return true;
      if (frame.tag === "img" && (frame.attribs.src ?? "").includes("wikidot.com/avatar.php")) return true;
      if (DROP_CLASS_RE.test(frame.attribs.class ?? "")) return true;
      // Theme CSS published as a code block; in-story code blocks (terminal logs) stay.
      if (/\bcode\b/.test(frame.attribs.class ?? "") && CSS_RULE_RE.test(frame.text)) return true;
      if (frame.tag === "p" && frame.text.includes("For information on how to use this component")) return true;
      if (frame.tag === "p" && !frame.text.trim() && frame.mediaChildren.length === 0) return true;
      return false;
    },
    transformTags: {
      a: (tag, attribs) => ({ tagName: tag, attribs: { ...attribs, href: absolutize(attribs.href ?? "") } }),
      img: (tag, attribs) => {
        const src = imageSrc(attribs.src ?? "");
        if (/^https:\/\/[^/]+\.wdfiles\.com\//.test(src) && !imageUrls.includes(src)) imageUrls.push(src);
        const kept: Record<string, string> = { src };
        for (const k of ["alt", "title", "width", "height"]) if (attribs[k]) kept[k] = attribs[k];
        return { tagName: tag, attribs: kept };
      },
    },
  });

  // sanitizeStoryHtml drops style/class, so collapsible-block-unfolded (display:none) content shows as plain divs.
  const bodyHtml = sanitizeStoryHtml(cleaned.replace(/<a\b[^>]*>\s*<\/a>/g, ""));
  const firstPara = bodyHtml.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? "";
  const intro = excerpt(firstPara.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(), bodyHtml, 300);

  return { bodyHtml, intro, bylineAuthor, imageUrls };
}
