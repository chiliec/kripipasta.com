import { wilsonScore } from "@/lib/scoring/wilson";

export const BASE_URL = "https://scp-wiki.wikidot.com";
export const CROM_URL = "https://api.crom.avn.sh/graphql";
export const DEFAULT_MIN_RATING = 100;
export const PAGE_SIZE = 100;
export const FIXED_TAG = "SCP Foundation";

/** Articles are reference-format (not tales, filtered by the query); these tale tags are still out. */
export const EXCLUDED_TAGS: ReadonlySet<string> = new Set(["adult", "hub", "poetry"]);

/** Genre tags worth a chip → display name. Canon/character/event/format tags are dropped. */
export const GENRE_TAGS: Record<string, string> = {
  horror: "Horror", comedy: "Comedy", "science-fiction": "Science Fiction", worldbuilding: "Worldbuilding",
  "cosmic-horror": "Cosmic Horror", "first-person": "First Person", mystery: "Mystery", bleak: "Bleak",
  "post-apocalyptic": "Post-Apocalyptic", absurdism: "Absurdism", "psychological-horror": "Psychological Horror",
  "body-horror": "Body Horror", "slice-of-life": "Slice of Life", action: "Action", "black-comedy": "Black Comedy",
  fantasy: "Fantasy", correspondence: "Correspondence", heartwarming: "Heartwarming", "military-fiction": "Military Fiction",
  adventure: "Adventure", apocalyptic: "Apocalyptic", "alternate-history": "Alternate History", bittersweet: "Bittersweet",
  romance: "Romance", "period-piece": "Period Piece", ghost: "Ghost", joke: "Joke", "spy-fiction": "Spy Fiction",
  xenofiction: "Xenofiction", "no-dialogue": "No Dialogue",
};

export interface CromTale {
  url: string;
  title: string;
  /** Net rating (up − down). */
  rating: number;
  voteCount: number;
  tags: string[];
  createdAt: Date;
  wikidotId: number;
  /** First AUTHOR attribution, else first SUBMITTER (the page creator — the author for nearly all tales). */
  author: string;
}

/** Crom GraphQL body. Values are inlined: a filter object may not mix `_and` with sibling keys, and `tags: {eq}` means "contains". */
export function cromBody(minRating: number, after: string | null): string {
  const query =
    `{ pages(sort: {key: RATING, order: DESC}, filter: {url: {startsWith: "http://scp-wiki.wikidot.com"}, ` +
    `wikidotInfo: {tags: {eq: "tale"}, rating: {gte: ${minRating}}}}, first: ${PAGE_SIZE}${after ? `, after: ${JSON.stringify(after)}` : ""}) ` +
    `{ pageInfo { hasNextPage endCursor } edges { node { url wikidotInfo { title rating voteCount tags createdAt wikidotId } attributions { type user { name } } } } } }`;
  return JSON.stringify({ query });
}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json | null => (v && typeof v === "object" ? (v as Json) : null);

export function parseCromPage(json: unknown): { tales: CromTale[]; next: string | null } {
  const pages = obj(obj(obj(json)?.data)?.pages);
  const edges = Array.isArray(pages?.edges) ? pages.edges : [];
  const tales: CromTale[] = [];
  for (const edge of edges) {
    const node = obj(obj(edge)?.node);
    const info = obj(node?.wikidotInfo);
    if (!node || !info || typeof node.url !== "string" || typeof info.title !== "string") continue;
    const attributions = (Array.isArray(node.attributions) ? node.attributions : []).map(obj).filter((a): a is Json => !!a);
    const byType = (type: string) => attributions.find((a) => a.type === type);
    const author = byType("AUTHOR") ?? byType("SUBMITTER");
    tales.push({
      url: node.url,
      title: info.title,
      rating: Number(info.rating ?? 0),
      voteCount: Number(info.voteCount ?? 0),
      tags: Array.isArray(info.tags) ? info.tags.map(String) : [],
      createdAt: typeof info.createdAt === "string" ? new Date(info.createdAt) : new Date(),
      wikidotId: Number(info.wikidotId ?? 0),
      author: String(obj(author?.user)?.name ?? ""),
    });
  }
  const pageInfo = obj(pages?.pageInfo);
  const next = pageInfo?.hasNextPage === true && typeof pageInfo.endCursor === "string" ? pageInfo.endCursor : null;
  return { tales, next };
}

/** Crom reports http:// URLs; the site serves (and we store/attribute) https://. */
export function taleUrl(cromUrl: string): string {
  return cromUrl.replace(/^http:\/\//, "https://");
}

export function votesFromRating(rating: number, voteCount: number): { likes: number; dislikes: number; score: number } {
  const likes = Math.max(0, Math.round((voteCount + rating) / 2));
  const dislikes = Math.max(0, voteCount - likes);
  return { likes, dislikes, score: wilsonScore(likes, dislikes) };
}

export function excludedTag(tags: string[]): string | null {
  return tags.find((t) => EXCLUDED_TAGS.has(t)) ?? null;
}

export function tagNames(tags: string[]): string[] {
  return [FIXED_TAG, ...tags.flatMap((t) => (GENRE_TAGS[t] ? [GENRE_TAGS[t]] : []))];
}
