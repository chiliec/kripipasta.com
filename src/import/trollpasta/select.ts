import { wilsonScore } from "@/lib/scoring/wilson";

export const BASE_URL = "https://trollpasta.com";

/** Curation tiers, best first. A page's tier is the first one it belongs to. */
export const TIERS = ["Hall of Fame", "FOTM", "Classics", "Featured Pastas"] as const;
export type Tier = (typeof TIERS)[number];

/** No vote data on the wiki; 100 synthetic votes per story, every tier below the Creepypasta Wiki's lowest (78%). */
export const TIER_VOTES = 100;
export const TIER_RATING_PCT: Record<Tier, number> = {
  "Hall of Fame": 72,
  FOTM: 68,
  Classics: 64,
  "Featured Pastas": 60,
};

/** Non-story / off-site pages. "Videos" means "has an embedded reading" here, so it stays. */
export const EXCLUDED_CATEGORIES: ReadonlySet<string> = new Set([
  "NSFW", "Lists", "Blog posts", "Meta", "Templates", "User", "Deutsches Trollpasta Wiki", "To Translate", "Copypasta",
]);

export const FIXED_TAG = "Trollpasta";

/** Category → tag name. Everything else on the wiki is housekeeping or too fine-grained to be a chip. */
export const FRANCHISE_TAGS: Record<string, string> = {
  "Lost Episodes": "Lost Episodes",
  Mario: "Mario",
  Sonic: "Sonic",
  Pokemon: "Pokemon",
  SpongeBob: "SpongeBob",
  "Jeff the Killer": "Jeff the Killer",
  Minecrap: "Minecraft",
  Roblox: "Roblox",
  Memes: "Memes",
};

export function bestTier(categories: string[]): Tier | null {
  const set = new Set(categories);
  return TIERS.find((t) => set.has(t)) ?? null;
}

export function tierVotes(tier: Tier): { likes: number; dislikes: number; score: number } {
  const likes = Math.round((TIER_VOTES * TIER_RATING_PCT[tier]) / 100);
  const dislikes = TIER_VOTES - likes;
  return { likes, dislikes, score: wilsonScore(likes, dislikes) };
}

export function tagNames(categories: string[]): string[] {
  return [FIXED_TAG, ...categories.flatMap((c) => (FRANCHISE_TAGS[c] ? [FRANCHISE_TAGS[c]] : []))];
}

export function sourceUrl(title: string): string {
  return `${BASE_URL}/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}
