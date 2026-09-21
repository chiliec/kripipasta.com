import he from "he";

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
