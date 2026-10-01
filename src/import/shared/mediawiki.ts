import { join } from "node:path";
import { prisma } from "@/lib/db";
import { stripHtml } from "@/lib/story-display";
import { NetworkError, downloadFile, fetchText } from "./fetch";
import { localImageName, rewriteImageSrcs } from "./images";
import { normalizeTitle } from "./text";
import { loadImportState, writeStory } from "./write";

type Json = Record<string, unknown>;
export const obj = (v: unknown): Json | null => (v && typeof v === "object" ? (v as Json) : null);

export function apiUrl(apiBase: string, params: Record<string, string>): string {
  return `${apiBase}?${new URLSearchParams({ ...params, format: "json" })}`;
}

/** Author line inside a wiki footer: "Credited to|Written by" + optional span/link wrapper. [1] = href, [2] = name. */
export const AUTHOR_CREDIT_RE = /(?:Credited to|Written by)(?:\s|&#160;)*(?:<span[^>]*>)?\s*(?:<a[^>]*href="([^"]+)"[^>]*>)?(?:<span>)?\s*([^<]+?)(?:\s|&#160;)*(?:<\/|<br|$)/;

export interface ParsedPage {
  pageid: number;
  title: string;
  categories: string[];
  /** Cleaned, sanitized body. Image src are canonical remote URLs (rewritten to /images/… by the run loop). */
  bodyHtml: string;
  intro: string;
  authorName: string;
  authorLink: string;
  /** Canonical image URLs referenced by bodyHtml, deduped, document order. */
  imageUrls: string[];
}

/** Inner HTML of div.mw-parser-output, comments stripped, <span class="mw-headline"> unwrapped. */
export function mediawikiBody(text: string): string {
  const open = text.indexOf("mw-parser-output");
  const body = open >= 0 ? text.slice(text.indexOf(">", open) + 1, text.lastIndexOf("</div>")) : text;
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<span class="mw-headline"[^>]*>([\s\S]*?)<\/span>/g, "$1");
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

/** Everything that differs between MediaWiki sites imported by curated-category tiers. */
export interface TieredSite<T extends string> {
  /** Cache dir name under .cache/ and log label. */
  source: string;
  /** e.g. "https://creepypasta.fandom.com/api.php" */
  apiBase: string;
  /** Curation tiers, best first. A page's tier is the first one it belongs to. */
  tiers: readonly T[];
  tierVotes(tier: T): { likes: number; dislikes: number; score: number };
  excludedCategories: ReadonlySet<string>;
  /** `allcategories&acmin=` threshold for the topical set passed to tagNames, or null to skip the call. */
  topicalMin: number | null;
  tagNames(categories: string[], topical: ReadonlySet<string>): string[];
  parsePage(json: unknown): ParsedPage | null;
  sourceUrl(title: string): string;
  imagePrefix: string;
  downloadUrl(canonical: string): string;
  voterNamespace(pageid: number): string;
}

const IMAGES_DIR = join(process.cwd(), "public", "images");
const MIN_TEXT_CHARS = 500;

type Skip = { title: string; reason: string };

/** Tier-ordered import loop shared by the Fandom and WikiTide importers. CLI: --limit N --offset N --dry-run. */
export async function runTieredImport<T extends string>(site: TieredSite<T>, argv = process.argv.slice(2)): Promise<void> {
  const flag = (name: string) => argv.includes(name);
  const num = (name: string, def: number) => {
    const i = argv.indexOf(name);
    return i >= 0 ? Number(argv[i + 1]) : def;
  };
  const LIMIT = num("--limit", Number.MAX_SAFE_INTEGER);
  // Queue order is deterministic (category listings are cached), so --offset resumes an interrupted run.
  const OFFSET = num("--offset", 0);
  const DRY_RUN = flag("--dry-run");

  const api = async (params: Record<string, string>): Promise<unknown> => {
    const text = await fetchText(apiUrl(site.apiBase, params), site.source);
    return text ? JSON.parse(text) : null;
  };

  /** All main-namespace members of a category, following cmcontinue. */
  async function categoryMembers(category: string): Promise<{ pageid: number; title: string }[]> {
    const out: { pageid: number; title: string }[] = [];
    let cont: string | null = null;
    do {
      const params: Record<string, string> = {
        action: "query", list: "categorymembers", cmtitle: `Category:${category}`, cmnamespace: "0", cmlimit: "500",
      };
      if (cont) params.cmcontinue = cont;
      const page = parseCategoryMembers(await api(params));
      out.push(...page.members);
      cont = page.next;
    } while (cont);
    return out;
  }

  // Topical categories (≥ topicalMin members) — the tag allowlist for sites that derive tags from categories.
  const topical = new Set<string>();
  if (site.topicalMin !== null) {
    const cats = await api({ action: "query", list: "allcategories", acmin: String(site.topicalMin), aclimit: "500" });
    for (const c of (cats as { query?: { allcategories?: { "*": string }[] } })?.query?.allcategories ?? []) topical.add(c["*"]);
  }

  // Pages by best tier, best tier first; a page appears once.
  const queue: { pageid: number; title: string; tier: T }[] = [];
  const seen = new Set<number>();
  for (const tier of site.tiers) {
    for (const m of await categoryMembers(tier)) {
      if (seen.has(m.pageid)) continue;
      seen.add(m.pageid);
      queue.push({ ...m, tier });
    }
  }
  console.log(`queue: ${queue.length} pages; topical tags=${topical.size}; limit=${LIMIT} offset=${OFFSET} dry=${DRY_RUN}`);

  const state = await loadImportState("en");
  const skips: Skip[] = [];
  const tagDelta = new Map<string, number>();
  let done = 0, created = 0, updated = 0, imagesOk = 0, imagesFailed = 0, networkSkips = 0;

  for (const item of queue.slice(OFFSET)) {
    if (done >= LIMIT) break;
    try {
      const result = await importOne(item);
      if ("skip" in result) { skips.push({ title: item.title, reason: result.skip }); continue; }
      done++;
      if (result.created) created++; else updated++;
      imagesOk += result.imagesOk; imagesFailed += result.imagesFailed;
      for (const t of result.newTags) tagDelta.set(t, (tagDelta.get(t) ?? 0) + 1);
      if (done % 50 === 0) console.log(`… ${done} +${OFFSET} (${item.title})`);
    } catch (err) {
      if (err instanceof NetworkError) { networkSkips++; skips.push({ title: item.title, reason: `network: ${err.message}` }); continue; }
      // Prisma P2028 = transaction timed out over a laggy tunnel; rolled back atomically, safe to retry on re-run.
      if (err && typeof err === "object" && "code" in err && err.code === "P2028") {
        networkSkips++; skips.push({ title: item.title, reason: `db-timeout: ${String(err)}` }); continue;
      }
      throw err;
    }
  }

  if (!DRY_RUN) {
    for (const [slug, n] of tagDelta) {
      await prisma.tag.update({ where: { slug }, data: { frequency: { increment: n } } });
    }
  }

  const byReason = new Map<string, number>();
  for (const s of skips) { const k = s.reason.split(":")[0]; byReason.set(k, (byReason.get(k) ?? 0) + 1); }
  console.log(`\nimported=${done} created=${created} updated=${updated} images ok=${imagesOk} failed=${imagesFailed}`);
  console.log("skipped:", Object.fromEntries(byReason));
  if (DRY_RUN) for (const s of skips) console.log(`  skip  ${s.reason.padEnd(24)} ${s.title}`);
  process.exitCode = networkSkips > 0 ? 1 : 0;

  // ---------------------------------------------------------------------------
  async function importOne(
    item: { pageid: number; title: string; tier: T },
  ): Promise<{ skip: string } | { created: boolean; imagesOk: number; imagesFailed: number; newTags: string[] }> {
    const parsed = site.parsePage(await api({ action: "parse", pageid: String(item.pageid), prop: "text|categories" }));
    if (!parsed) return { skip: "not-found" };

    const excluded = parsed.categories.find((c) => site.excludedCategories.has(c));
    if (excluded) return { skip: `category: ${excluded}` };
    if (stripHtml(parsed.bodyHtml).length < MIN_TEXT_CHARS) return { skip: "too-short" };

    const url = site.sourceUrl(parsed.title);
    const dupSource = state.titleToSource.get(normalizeTitle(parsed.title));
    if (dupSource !== undefined && dupSource !== url) return { skip: "duplicate-title" };

    const rev = parseFirstRevision(
      await api({ action: "query", pageids: String(item.pageid), prop: "revisions", rvdir: "newer", rvlimit: "1", rvprop: "timestamp|user" }),
    );
    const date = rev?.date ?? new Date();

    // Images: download originals, rewrite src to /images/<name>; failures stay as
    // /images/<name> so stripMissingImages() hides them at render.
    const srcMap = new Map<string, string>();
    let ok = 0, failed = 0;
    for (const canonical of parsed.imageUrls) {
      const name = localImageName(canonical, site.imagePrefix);
      srcMap.set(canonical, `/images/${name}`);
      if (DRY_RUN) continue;
      if (await downloadFile(site.downloadUrl(canonical), join(IMAGES_DIR, name))) ok++; else failed++;
    }
    const contentHtml = rewriteImageSrcs(parsed.bodyHtml, srcMap);

    const tier = site.tiers.find((t) => parsed.categories.includes(t)) ?? item.tier;
    const { likes, dislikes, score } = site.tierVotes(tier);
    const tagNames = site.tagNames(parsed.categories, topical);
    const existingId = state.idBySource.get(url);

    if (DRY_RUN) {
      console.log(`  ok    ${tier.padEnd(18)} ${date.getUTCFullYear()} ${parsed.title}  [${tagNames.join(", ")}]${parsed.authorName ? `  by ${parsed.authorName}` : ""}`);
      return { created: !existingId, imagesOk: parsed.imageUrls.length, imagesFailed: 0, newTags: [] };
    }

    const { created, newTags } = await writeStory(
      {
        data: {
          title: parsed.title,
          intro: parsed.intro,
          contentHtml,
          language: "en",
          status: "APPROVED",
          authorName: parsed.authorName,
          authorLink: parsed.authorLink,
          sourceUrl: url,
          likeCount: likes,
          dislikeCount: dislikes,
          score,
          createdAt: date,
          approvedAt: date,
        },
        likes,
        dislikes,
        voterNamespace: site.voterNamespace(parsed.pageid),
        tagNames,
      },
      state,
    );
    return { created, imagesOk: ok, imagesFailed: failed, newTags };
  }
}
