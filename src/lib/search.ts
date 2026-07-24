import { searchApprovedStories, type StoryListItem } from "@/lib/stories";
import {
  searchPublishedDossiers,
  type DossierListItem,
} from "@/lib/dossiers";

const MAX_QUERY_LENGTH = 100;

/**
 * Normalize a raw user query for full-text search. Trims, collapses internal
 * whitespace, and caps length. Returns null when nothing searchable remains.
 * Operator characters are left intact — websearch_to_tsquery parses them safely.
 */
export function normalizeQuery(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
  return cleaned.length > 0 ? cleaned : null;
}

export interface SearchResults {
  query: string;
  stories: StoryListItem[];
  dossiers: DossierListItem[];
  total: number;
}

export async function search(
  raw: string | undefined | null,
): Promise<SearchResults | null> {
  const query = normalizeQuery(raw);
  if (!query) return null;
  const [stories, dossiers] = await Promise.all([
    searchApprovedStories(query),
    searchPublishedDossiers(query),
  ]);
  return { query, stories, dossiers, total: stories.length + dossiers.length };
}
