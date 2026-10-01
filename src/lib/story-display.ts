/** Strip HTML tags, decode nothing, collapse all whitespace to single spaces. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A short teaser. Prefers `intro`; otherwise strips `contentHtml`.
 * Truncates on a word boundary and appends an ellipsis when over `maxChars`.
 */
export function excerpt(
  intro: string,
  contentHtml: string,
  maxChars = 160,
): string {
  const source = intro.trim() || stripHtml(contentHtml);
  if (source.length <= maxChars) return source;
  const clipped = source.slice(0, maxChars);
  const lastSpace = clipped.lastIndexOf(" ");
  const base = lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped;
  return `${base.trimEnd()}…`;
}

/** Estimated reading time in whole minutes at 200 wpm, minimum 1. */
export function readingTimeMinutes(contentHtml: string): number {
  const text = stripHtml(contentHtml);
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

/** Long-form date, Russian by default (e.g. "3 марта 2026 г."). */
export function formatStoryDate(date: Date, locale = "ru-RU"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Returns a translation key for the qualitative rating label derived from a 0–10 score. */
export function ratingKey(
  score10: number,
): "ratingGood" | "ratingMixed" | "ratingNiche" {
  if (score10 >= 7.5) return "ratingGood";
  if (score10 >= 5) return "ratingMixed";
  return "ratingNiche";
}

export interface SourceAttribution {
  label: string;
  license?: string;
  licenseUrl?: string;
}

const SOURCES: Record<string, SourceAttribution> = {
  "mrakopedia.net": {
    label: "Мракопедия",
    license: "CC BY-NC-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  },
  "creepypasta.fandom.com": {
    label: "Creepypasta Wiki",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  "scp-wiki.wikidot.com": {
    label: "SCP Foundation",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  "trollpasta.com": {
    label: "Trollpasta Wiki",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
};

/** Attribution line data for an imported story's sourceUrl; null when there is no source. */
export function sourceAttribution(sourceUrl: string): SourceAttribution | null {
  if (!sourceUrl) return null;
  let host: string;
  try {
    host = new URL(sourceUrl).hostname;
  } catch {
    return null;
  }
  return SOURCES[host] ?? { label: host };
}
