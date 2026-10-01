import { wilsonScore } from "@/lib/scoring/wilson";

export const BASE_URL = "https://creepypasta.fandom.com";

/** Curation tiers, best first. A page's tier is the first one it belongs to. */
export const TIERS = ["PotM", "Spotlighted Pastas", "Suggested Reading", "Historical Archive"] as const;
export type Tier = (typeof TIERS)[number];

/** Fandom has no vote data; seed a fixed 100 votes per story at a per-tier approval rate. */
export const TIER_VOTES = 100;
export const TIER_RATING_PCT: Record<Tier, number> = {
  PotM: 94,
  "Spotlighted Pastas": 90,
  "Suggested Reading": 86,
  "Historical Archive": 78,
};

/** Published literature and non-story pages — same policy as Mrakopedia's "Литература" exclusion. */
export const EXCLUDED_CATEGORIES: ReadonlySet<string> = new Set([
  "EAP", "HPL", "Historical Archive/PD", "Books", "Poetry", "Videos", "Blog posts", "Meta",
]);

/** Housekeeping / curation categories that must not become tags. */
export const META_CATEGORIES: ReadonlySet<string> = new Set([
  ...TIERS, "Reddit Pastas", "Pages with broken file links", "Noindexed pages", "Archived pages",
  "Content", "Contextual", "CC-BY-SA files", "CC-BY files", "CC0", "User Stories",
  "Writers' Showcase", "Writers' Workshop", "Longpasta", "Micropasta", "NSFW",
  // Author collections / admin housekeeping that happen to have ≥50 members.
  "AGB", "Admin Blogs", "Article Subpages", "DFPC15", "EmpyrealInvective", "Jdeschene", "MakRalston",
  "Mmpratt99 deviantart", "Talk Archives", "Template documentation", "The Vesper's Bell",
]);

export function bestTier(categories: string[]): Tier | null {
  const set = new Set(categories);
  return TIERS.find((t) => set.has(t)) ?? null;
}

export function tierVotes(tier: Tier): { likes: number; dislikes: number; score: number } {
  const likes = Math.round((TIER_VOTES * TIER_RATING_PCT[tier]) / 100);
  const dislikes = TIER_VOTES - likes;
  return { likes, dislikes, score: wilsonScore(likes, dislikes) };
}

/** Tags = categories that are topical (≥50 members on the wiki) and neither meta nor excluded. */
export function tagCategories(categories: string[], topical: ReadonlySet<string>): string[] {
  return categories.filter((c) => topical.has(c) && !META_CATEGORIES.has(c) && !EXCLUDED_CATEGORIES.has(c));
}

export function sourceUrl(title: string): string {
  return `${BASE_URL}/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}
