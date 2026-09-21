import { wilsonScore } from "@/lib/scoring/wilson";
import { BASE_URL, type RatingRow } from "./parse";

/** Mrakopedia's own convention: professional/published fiction lives here. Comics are image-only. */
export const EXCLUDED_CATEGORIES: ReadonlySet<string> = new Set(["Литература", "Комиксы"]);

/** Housekeeping categories that must not become tags. */
export const META_CATEGORIES: ReadonlySet<string> = new Set([
  "Рейтинг", "Крипи", "Избранное", "К удалению", "НПЧДХ", "Без иллюстраций",
]);

export function deriveVotes(ratingPct: number, votes: number) {
  const likes = Math.round((votes * ratingPct) / 100);
  const dislikes = votes - likes;
  return { likes, dislikes, score: wilsonScore(likes, dislikes) };
}

/** Highest Wilson lower bound first; ties keep table order (Array.sort is stable). */
export function rankRows(rows: RatingRow[]): RatingRow[] {
  return [...rows].sort(
    (a, b) => deriveVotes(b.ratingPct, b.votes).score - deriveVotes(a.ratingPct, a.votes).score,
  );
}

/** "Title (Имя Фамилия)" / "Title (И. Фамилия)" — Mrakopedia's marker for a named published author. */
export function hasAuthorSuffix(title: string): boolean {
  return /\(([А-ЯЁA-Z][а-яёa-z]*\.?\s*){1,3}[А-ЯЁA-Z][а-яёa-z-]+\)$/.test(title.trim());
}

export function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, "");
}

export function tagCategories(categories: string[]): string[] {
  return categories.filter((c) => !META_CATEGORIES.has(c) && !c.startsWith("Мракопедия"));
}

export function uniqueSlug(base: string, taken: Set<string>): string {
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  taken.add(slug);
  return slug;
}

export function historyUrl(href: string): string {
  const title = href.replace(/^\/wiki\//, "");
  return `${BASE_URL}/w/index.php?title=${title}&action=history&dir=prev&limit=1`;
}
