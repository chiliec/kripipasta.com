import { join } from "node:path";
import { prisma } from "@/lib/db";
import { stripHtml } from "@/lib/story-display";
import { NetworkError, downloadFile, fetchText } from "../shared/fetch";
import { localImageName, rewriteImageSrcs } from "../shared/images";
import { normalizeTitle } from "../shared/text";
import { loadImportState, writeStory } from "../shared/write";
import { apiUrl, downloadUrl, parseCategoryMembers, parseFirstRevision, parseStoryJson } from "./parse";
import { EXCLUDED_CATEGORIES, TIERS, type Tier, bestTier, sourceUrl, tagCategories, tierVotes } from "./select";

const SOURCE = "creepypasta-wiki";
const IMAGES_DIR = join(process.cwd(), "public", "images");
const MIN_TEXT_CHARS = 500;

// --- CLI args ---------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(name);
const num = (name: string, def: number) => {
  const i = argv.indexOf(name);
  return i >= 0 ? Number(argv[i + 1]) : def;
};
const LIMIT = num("--limit", Number.MAX_SAFE_INTEGER);
const DRY_RUN = flag("--dry-run");

type Skip = { title: string; reason: string };

async function api(params: Record<string, string>): Promise<unknown> {
  const text = await fetchText(apiUrl(params), SOURCE);
  return text ? JSON.parse(text) : null;
}

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

async function main() {
  // Topical categories (≥50 members) — the tag allowlist.
  const cats = await api({ action: "query", list: "allcategories", acmin: "50", aclimit: "500" });
  const topical = new Set(
    ((cats as { query?: { allcategories?: { "*": string }[] } })?.query?.allcategories ?? []).map((c) => c["*"]),
  );

  // Pages by best tier, best tier first; a page appears once.
  const queue: { pageid: number; title: string; tier: Tier }[] = [];
  const seen = new Set<number>();
  for (const tier of TIERS) {
    for (const m of await categoryMembers(tier)) {
      if (seen.has(m.pageid)) continue;
      seen.add(m.pageid);
      queue.push({ ...m, tier });
    }
  }
  console.log(`queue: ${queue.length} pages; topical tags=${topical.size}; limit=${LIMIT} dry=${DRY_RUN}`);

  const state = await loadImportState("en");
  const skips: Skip[] = [];
  const tagDelta = new Map<string, number>();
  let done = 0, created = 0, updated = 0, imagesOk = 0, imagesFailed = 0, networkSkips = 0;

  for (const item of queue) {
    if (done >= LIMIT) break;
    try {
      const result = await importOne(item);
      if ("skip" in result) { skips.push({ title: item.title, reason: result.skip }); continue; }
      done++;
      if (result.created) created++; else updated++;
      imagesOk += result.imagesOk; imagesFailed += result.imagesFailed;
      for (const t of result.newTags) tagDelta.set(t, (tagDelta.get(t) ?? 0) + 1);
      if (done % 50 === 0) console.log(`… ${done} (${item.title})`);
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
    item: { pageid: number; title: string; tier: Tier },
  ): Promise<{ skip: string } | { created: boolean; imagesOk: number; imagesFailed: number; newTags: string[] }> {
    const parsed = parseStoryJson(await api({ action: "parse", pageid: String(item.pageid), prop: "text|categories" }));
    if (!parsed) return { skip: "not-found" };

    const excluded = parsed.categories.find((c) => EXCLUDED_CATEGORIES.has(c));
    if (excluded) return { skip: `category: ${excluded}` };
    if (stripHtml(parsed.bodyHtml).length < MIN_TEXT_CHARS) return { skip: "too-short" };

    const url = sourceUrl(parsed.title);
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
      const name = localImageName(canonical, "creepypasta");
      srcMap.set(canonical, `/images/${name}`);
      if (DRY_RUN) continue;
      if (await downloadFile(downloadUrl(canonical), join(IMAGES_DIR, name))) ok++; else failed++;
    }
    const contentHtml = rewriteImageSrcs(parsed.bodyHtml, srcMap);

    const tier = bestTier(parsed.categories) ?? item.tier;
    const { likes, dislikes, score } = tierVotes(tier);
    const tagNames = tagCategories(parsed.categories, topical);
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
        voterNamespace: `creepypasta-wiki:${parsed.pageid}`,
        tagNames,
      },
      state,
    );
    return { created, imagesOk: ok, imagesFailed: failed, newTags };
  }
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
