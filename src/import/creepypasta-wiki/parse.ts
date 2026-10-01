import sanitizeHtml from "sanitize-html";
import { sanitizeStoryHtml } from "@/lib/sanitize";
import { excerpt, stripHtml } from "@/lib/story-display";
import { AUTHOR_CREDIT_RE, type ParsedPage, mediawikiBody, obj } from "../shared/mediawiki";
import { BASE_URL } from "./select";

const IMAGE_RE = /^(https:\/\/static\.wikia\.nocookie\.net\/.+?\/revision\/latest)(?:\/|\?|$)/;

/** "…/Name.gif/revision/latest/scale-to-width-down/300?cb=1" → "…/Name.gif/revision/latest". */
export function canonicalImageUrl(src: string): string | null {
  return src.match(IMAGE_RE)?.[1] ?? null;
}

/** The CDN transcodes to WebP unless asked for the original. */
export function downloadUrl(canonical: string): string {
  return `${canonical}?format=original`;
}

function absolutize(url: string): string {
  return url.startsWith("/") ? `${BASE_URL}${url}` : url;
}

// Two real footer shapes:
//   <div style="margin: 2em 0 .5em;"><hr /> <i>Original author unknown</i></div>
//   <hr /><p><i>Written by <a …>Name</a> (or Credited to&#160;<span><a …><span>Name</span></a></span>)<br />Originally uploaded on …<br /><span>Content is available under …</span></i></p>
const FOOTER_RE = /(?:<div style="margin: 2em 0 \.5em;">\s*<hr \/>|(?:<hr \/>\s*)?<p>)\s*<i>\s*(?:<b>)?\s*((?:Written by|Credited to|Original author unknown)[\s\S]*?)<\/i>\s*<\/(?:div|p)>/;
const UPLOADED_RE = /<p>\s*<i>Originally uploaded on[^<]*<\/i>\s*<\/p>/g;

/** Strip wiki chrome, absolutize links, canonicalise images, drop empty paragraphs. */
function cleanBody(raw: string, imageUrls: string[]): string {
  return sanitizeHtml(raw, {
    allowedTags: false,
    allowedAttributes: false,
    allowVulnerableTags: true, // transform pass only; sanitizeStoryHtml() runs before storage
    exclusiveFilter: (frame) => {
      const cls = frame.attribs.class ?? "";
      if (frame.attribs.id === "toc") return true;
      if (frame.tag === "svg") return true;
      if (/\b(mw-editsection|catlinks|printfooter)\b/.test(cls)) return true;
      if (frame.tag === "p" && !frame.text.trim() && frame.mediaChildren.length === 0) return true;
      return false;
    },
    transformTags: {
      a: (tag, attribs) => ({ tagName: tag, attribs: { ...attribs, href: absolutize(attribs.href ?? "") } }),
      img: (tag, attribs) => {
        const src = canonicalImageUrl(attribs.src ?? "") ?? attribs.src ?? "";
        if (src.startsWith("https://static.wikia.nocookie.net/") && !imageUrls.includes(src)) imageUrls.push(src);
        const kept: Record<string, string> = { src };
        for (const k of ["alt", "title", "width", "height"]) if (attribs[k]) kept[k] = attribs[k];
        return { tagName: tag, attribs: kept };
      },
    },
  });
}

/** Parse an `action=parse&prop=text|categories` response. Null on error or missing text. */
export function parseStoryJson(json: unknown): ParsedPage | null {
  const parse = obj(obj(json)?.parse);
  const text = obj(parse?.text)?.["*"];
  if (!parse || typeof text !== "string" || typeof parse.pageid !== "number" || typeof parse.title !== "string") return null;

  const categories = (Array.isArray(parse.categories) ? parse.categories : [])
    .map((c) => String(obj(c)?.["*"] ?? "").replace(/_/g, " "))
    .filter(Boolean);

  let body = mediawikiBody(text);

  // Author footer ("Written by X" / "Original author unknown"): lift and remove.
  let authorName = "";
  let authorLink = "";
  const footer = body.match(FOOTER_RE);
  if (footer) {
    const m = footer[1].match(AUTHOR_CREDIT_RE);
    if (m) {
      authorName = stripHtml(m[2]);
      authorLink = m[1] ? absolutize(m[1]) : "";
    }
    body = body.replace(FOOTER_RE, "");
  }
  body = body.replace(UPLOADED_RE, "");

  // Series navigation: <p><span id="nav">…</p><div align="center">prev | next</div> is the last thing before the (now removed) footer.
  const navAt = body.indexOf('<span id="nav">');
  if (navAt >= 0) {
    const pAt = body.lastIndexOf("<p>", navAt);
    body = body.slice(0, pAt >= 0 ? pAt : navAt);
  }

  const imageUrls: string[] = [];
  const bodyHtml = sanitizeStoryHtml(cleanBody(body, imageUrls).replace(/<a\b[^>]*>\s*<\/a>/g, ""));
  const firstPara = bodyHtml.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? "";
  // Inline tags (links, emphasis) are removed without padding so "a <a>dragon</a>." stays "a dragon."
  const intro = excerpt(firstPara.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(), bodyHtml, 300);

  return { pageid: parse.pageid, title: parse.title, categories, bodyHtml, intro, authorName, authorLink, imageUrls };
}
