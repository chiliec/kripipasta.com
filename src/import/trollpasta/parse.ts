import sanitizeHtml from "sanitize-html";
import { sanitizeStoryHtml } from "@/lib/sanitize";
import { excerpt, stripHtml } from "@/lib/story-display";
import { AUTHOR_CREDIT_RE, type ParsedPage, mediawikiBody, obj } from "../shared/mediawiki";
import { BASE_URL } from "./select";

const IMAGE_HOST = "https://static.wikitide.net/trollpastawiki/";
// "//static.wikitide.net/trollpastawiki/thumb/1/1e/Name.jpg/300px-Name.jpg" → "https://static.wikitide.net/trollpastawiki/1/1e/Name.jpg"
const IMAGE_RE = /^(?:https?:)?\/\/static\.wikitide\.net\/trollpastawiki\/(?:thumb\/)?([0-9a-f]\/[0-9a-f]{2}\/[^/?#]+)/;

export function canonicalImageUrl(src: string): string | null {
  const m = src.match(IMAGE_RE);
  return m ? `${IMAGE_HOST}${m[1]}` : null;
}

/** WikiTide serves originals as-is (no WebP transcoding). */
export function downloadUrl(canonical: string): string {
  return canonical;
}

function absolutize(url: string): string {
  return url.startsWith("/") ? `${BASE_URL}${url}` : url;
}

// Template:By, shapes seen:
//   <hr />\n<p><i>\nCredited to <a href="…" class="extiw">Name</a>\n</i>\n</p>   (also followed by <br />, or "Credited to&#160;Name&#160;" unlinked)
//   <hr />\n<p><i>\nWritten by <a href="/wiki/User:Name">Name</a><br />\n<span class="plainlinks">Content is available under …</span></i></p>
//   <hr /><p><i>\nOriginally on Geoshea's Lost Episodes Wiki\n</i></p>
const FOOTER_RE = /<hr \/>\s*<p>\s*<i>\s*((?:Credited to|Written by|Originally on)[\s\S]*?)<\/i>\s*(?:<br \/>\s*)?<\/p>/;
// Comments widget: a header table styled #5d7994 followed by the comments body; always the tail of the page.
const COMMENTS_RE = /<table[^>]*#5d7994/;

/** Strip wiki chrome and video embeds; absolutize links; canonicalise images. */
function cleanBody(raw: string, imageUrls: string[]): string {
  return sanitizeHtml(raw, {
    allowedTags: false,
    allowedAttributes: false,
    allowVulnerableTags: true, // transform pass only; sanitizeStoryHtml() runs before storage
    exclusiveFilter: (frame) => {
      const cls = frame.attribs.class ?? "";
      if (frame.attribs.id === "toc") return true;
      if (frame.tag === "svg") return true;
      if (/\b(mw-editsection|catlinks|printfooter)\b|embedvideo/.test(cls)) return true;
      // Warning-banner templates ("NSFW WARNING", "IT'S JUST A JOKE, BRO!").
      if (frame.tag === "table" && /NSFW WARNING|IT'S JUST A JOKE/.test(frame.text)) return true;
      // Heading over the (stripped) embedded readings.
      if (/^h\d$/.test(frame.tag) && /^youtube readings?$/i.test(frame.text.trim())) return true;
      if (frame.tag === "p" && !frame.text.trim() && frame.mediaChildren.length === 0) return true;
      return false;
    },
    transformTags: {
      a: (tag, attribs) => ({ tagName: tag, attribs: { ...attribs, href: absolutize(attribs.href ?? "") } }),
      img: (tag, attribs) => {
        const src = canonicalImageUrl(attribs.src ?? "") ?? attribs.src ?? "";
        if (src.startsWith(IMAGE_HOST) && !imageUrls.includes(src)) imageUrls.push(src);
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
  const commentsAt = body.search(COMMENTS_RE);
  if (commentsAt >= 0) body = body.slice(0, commentsAt);

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

  const imageUrls: string[] = [];
  const bodyHtml = sanitizeStoryHtml(cleanBody(body, imageUrls).replace(/<a\b[^>]*>\s*<\/a>/g, ""));
  const firstPara = bodyHtml.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? "";
  const intro = excerpt(firstPara.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(), bodyHtml, 300);

  return { pageid: parse.pageid, title: parse.title, categories, bodyHtml, intro, authorName, authorLink, imageUrls };
}
