import he from "he";
import sanitizeHtml from "sanitize-html";
import { sanitizeStoryHtml } from "@/lib/sanitize";
import { excerpt, stripHtml } from "@/lib/story-display";

export const BASE_URL = "https://mrakopedia.net";

export interface RatingRow {
  title: string;
  /** Percent-encoded site-relative path, e.g. "/wiki/%D0%9F…". */
  href: string;
  ratingPct: number;
  votes: number;
}

const RATING_ROW_RE =
  /<tr><td><a href="([^"]+)" title="([^"]*)">[^<]*<\/a><\/td><td>(\d+)%<\/td><td>(\d+)<\/td><\/tr>/g;

/** Rows of the "Рейтинг:Общий_рейтинг" table, in page order (highest average first). */
export function parseRatingTable(html: string): RatingRow[] {
  const rows: RatingRow[] = [];
  for (const m of html.matchAll(RATING_ROW_RE)) {
    rows.push({
      href: m[1],
      title: he.decode(m[2]),
      ratingPct: Number(m[3]),
      votes: Number(m[4]),
    });
  }
  return rows;
}

const RU_MONTHS: Record<string, number> = {
  января: 0, февраля: 1, марта: 2, апреля: 3, мая: 4, июня: 5,
  июля: 6, августа: 7, сентября: 8, октября: 9, ноября: 10, декабря: 11,
};

const HISTORY_DATE_RE =
  /class="mw-changeslist-date"[^>]*>(\d{1,2}):(\d{2}), (\d{1,2}) ([а-яё]+) (\d{4})</;

/** First-revision timestamp from `action=history&dir=prev&limit=1`. UTC; server TZ is unknown and irrelevant at day granularity. */
export function parseHistoryDate(html: string): Date | null {
  const m = html.match(HISTORY_DATE_RE);
  if (!m) return null;
  const month = RU_MONTHS[m[4]];
  if (month === undefined) return null;
  return new Date(Date.UTC(Number(m[5]), month, Number(m[3]), Number(m[1]), Number(m[2])));
}

export interface ParsedStory {
  title: string;
  categories: string[];
  ratingPct: number;
  votes: number;
  pid: number;
  /** Cleaned, sanitized body. Image src are absolute originals under https://mrakopedia.net/w/images/. */
  bodyHtml: string;
  intro: string;
  authorName: string;
  authorLink: string;
  /** Absolute image URLs referenced by bodyHtml, deduped, document order. */
  imageUrls: string[];
}

const SEE_ALSO_RE = /<h2>(?:(?!<\/h2>).)*См\.?\s*также(?:(?!<\/h2>).)*<\/h2>[\s\S]*$/;
const AUTHOR_RE = /Автор\s*[:—–-]\s*([^<\n]+)/;
const SOURCE_RE = /<a[^>]*href="([^"]+)"[^>]*>\s*Источник\s*<\/a>/;
// \b is ASCII-only in JS regex and never matches after a Cyrillic letter; use a
// Unicode-aware "not followed by another letter/digit" lookahead instead.
const META_PARA_RE = /^(Автор|Перевод|Переводчик|Источник|Оригинал)(?![\p{L}\p{N}])/u;

/** "/w/images/thumb/8/8a/Name.png/300px-Name.png" → "/w/images/8/8a/Name.png". Non-thumbs pass through. */
export function originalImagePath(src: string): string {
  const m = src.match(/^\/w\/images\/thumb\/(.+)\/[^/]+$/);
  return m ? `/w/images/${m[1]}` : src;
}

function absolutize(url: string): string {
  return url.startsWith("/") ? `${BASE_URL}${url}` : url;
}

function readConfig<T>(html: string, key: string): T | null {
  const m = html.match(new RegExp(`"${key}":(\\[[^\\]]*\\]|"(?:[^"\\\\]|\\\\.)*"|-?\\d+)`));
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as T;
  } catch {
    return null;
  }
}

/** Strip wiki chrome, absolutize links, resolve image originals, drop icon-sized images and empty paragraphs. */
function cleanBody(raw: string, imageUrls: string[]): string {
  return sanitizeHtml(raw, {
    allowedTags: false,
    allowedAttributes: false,
    exclusiveFilter: (frame) => {
      const cls = frame.attribs.class ?? "";
      if (frame.attribs.id === "toc") return true;
      if (/\b(mw-editsection|rating_box|w4g_rb_area|printfooter|catlinks)\b/.test(cls)) return true;
      if (frame.tag === "img" && Number(frame.attribs.width || 0) > 0 && Number(frame.attribs.width) <= 40) return true;
      if (frame.tag === "p" && !frame.text.trim() && frame.mediaChildren.length === 0) return true;
      return false;
    },
    transformTags: {
      a: (tag, attribs) => ({ tagName: tag, attribs: { ...attribs, href: absolutize(attribs.href ?? "") } }),
      img: (tag, attribs) => {
        const { srcset: _drop, ...rest } = attribs;
        void _drop;
        const src = absolutize(originalImagePath(attribs.src ?? ""));
        // exclusiveFilter drops icon-sized <img> from the output but runs independently
        // of this transform, so mirror its width check here too or the URL still leaks in.
        const isIcon = Number(attribs.width || 0) > 0 && Number(attribs.width) <= 40;
        if (!isIcon && src.startsWith(`${BASE_URL}/w/images/`) && !imageUrls.includes(src)) {
          imageUrls.push(src);
        }
        return { tagName: tag, attribs: { ...rest, src } };
      },
    },
  });
}

/**
 * Parse a Mrakopedia article page. Returns null when the page is not a main-namespace
 * article or has no content container.
 */
export function parseStoryPage(html: string): ParsedStory | null {
  if (readConfig<number>(html, "wgNamespaceNumber") !== 0) return null;
  const title = readConfig<string>(html, "wgTitle");
  const start = html.indexOf('id="mw-content-text"');
  const end = html.indexOf('<div class="printfooter"');
  if (!title || start < 0 || end < 0 || end <= start) return null;

  // Inner HTML of #mw-content-text: skip to the end of its opening tag.
  let body = html.slice(html.indexOf(">", start) + 1, end);
  body = body.replace(SEE_ALSO_RE, "");

  // Trailing "Автор / Источник" block after the last <hr />: lift into metadata,
  // and drop the block only when it consists solely of such lines.
  let authorName = "";
  let authorLink = "";
  const hrAt = body.lastIndexOf("<hr");
  if (hrAt >= 0) {
    const tail = body.slice(hrAt);
    authorName = tail.match(AUTHOR_RE)?.[1].trim() ?? "";
    authorLink = tail.match(SOURCE_RE)?.[1] ?? "";
    const paras = [...tail.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => stripHtml(m[1]));
    const onlyMeta = paras.length > 0 && paras.every((p) => p === "" || META_PARA_RE.test(p));
    if (onlyMeta) body = body.slice(0, hrAt);
  }

  const imageUrls: string[] = [];
  // Dropping an icon-sized <img> can leave its <a href="/wiki/Файл:…"> wrapper empty — remove those.
  const bodyHtml = sanitizeStoryHtml(cleanBody(body, imageUrls).replace(/<a\b[^>]*>\s*<\/a>/g, ""));

  const firstPara = bodyHtml.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? "";
  const intro = excerpt(stripHtml(firstPara), bodyHtml, 300);

  return {
    title,
    categories: readConfig<string[]>(html, "wgCategories") ?? [],
    ratingPct: Number(html.match(/W4GRB\.average_rating\[1\]=(\d+)/)?.[1] ?? 0),
    votes: 0, // vote count is only on the rating table; run.ts fills it from RatingRow
    pid: Number(html.match(/W4GRB\.pid\[1\]=(\d+)/)?.[1] ?? 0),
    bodyHtml,
    intro,
    authorName,
    authorLink,
    imageUrls,
  };
}
