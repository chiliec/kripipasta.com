import sanitizeHtml from "sanitize-html";
import { sanitizeStoryHtml } from "@/lib/sanitize";
import { excerpt, stripHtml } from "@/lib/story-display";
import { BASE_URL } from "./select";

export const API_URL = `${BASE_URL}/api.php`;

export function apiUrl(params: Record<string, string>): string {
  return `${API_URL}?${new URLSearchParams({ ...params, format: "json" })}`;
}

export interface ParsedPage {
  pageid: number;
  title: string;
  categories: string[];
  /** Cleaned, sanitized body. Image src are canonical static.wikia URLs (…/revision/latest). */
  bodyHtml: string;
  intro: string;
  authorName: string;
  authorLink: string;
  /** Canonical image URLs referenced by bodyHtml, deduped, document order. */
  imageUrls: string[];
}

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

type Json = Record<string, unknown>;
const obj = (v: unknown): Json | null => (v && typeof v === "object" ? (v as Json) : null);

// Two real footer shapes:
//   <div style="margin: 2em 0 .5em;"><hr /> <i>Original author unknown</i></div>
//   <hr /><p><i>Written by <a …>Name</a><br />Originally uploaded on …<br /><span>Content is available under …</span></i></p>
const FOOTER_RE = /(?:<div style="margin: 2em 0 \.5em;">\s*<hr \/>|(?:<hr \/>\s*)?<p>)\s*<i>\s*(?:<b>)?\s*((?:Written by|Original author unknown)[\s\S]*?)<\/i>\s*<\/(?:div|p)>/;
const WRITTEN_BY_RE = /Written by\s*(?:<a[^>]*href="([^"]+)"[^>]*>)?\s*([^<]+?)\s*(?:<\/a>|<br|$)/;
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

  // Inner HTML of div.mw-parser-output.
  const open = text.indexOf("mw-parser-output");
  let body = open >= 0 ? text.slice(text.indexOf(">", open) + 1, text.lastIndexOf("</div>")) : text;
  body = body
    .replace(/<!--[\s\S]*?-->/g, "")
    // <h2><span class="mw-headline" id="…">Title</span></h2> → <h2>Title</h2>
    .replace(/<span class="mw-headline"[^>]*>([\s\S]*?)<\/span>/g, "$1");

  // Author footer ("Written by X" / "Original author unknown"): lift and remove.
  let authorName = "";
  let authorLink = "";
  const footer = body.match(FOOTER_RE);
  if (footer) {
    const m = footer[1].match(WRITTEN_BY_RE);
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

/** Parse `prop=revisions&rvdir=newer&rvlimit=1&rvprop=timestamp|user`. */
export function parseFirstRevision(json: unknown): { date: Date; user: string } | null {
  const pages = obj(obj(obj(json)?.query)?.pages);
  if (!pages) return null;
  for (const page of Object.values(pages)) {
    const revs = obj(page)?.revisions;
    const rev = Array.isArray(revs) ? obj(revs[0]) : null;
    if (rev && typeof rev.timestamp === "string") {
      return { date: new Date(rev.timestamp), user: typeof rev.user === "string" ? rev.user : "" };
    }
  }
  return null;
}

/** Parse `list=categorymembers`; `next` is the cmcontinue token for the following page. */
export function parseCategoryMembers(json: unknown): { members: { pageid: number; title: string }[]; next: string | null } {
  const root = obj(json);
  const raw = obj(root?.query)?.categorymembers;
  const members = (Array.isArray(raw) ? raw : [])
    .map((m) => obj(m))
    .filter((m): m is Json => !!m && typeof m.pageid === "number" && typeof m.title === "string")
    .map((m) => ({ pageid: m.pageid as number, title: m.title as string }));
  const next = obj(root?.continue)?.cmcontinue;
  return { members, next: typeof next === "string" ? next : null };
}
