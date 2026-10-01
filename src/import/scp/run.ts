import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { stripHtml } from "@/lib/story-display";
import { NetworkError, downloadFile, fetchText, postJson } from "../shared/fetch";
import { localImageName, rewriteImageSrcs } from "../shared/images";
import { normalizeTitle } from "../shared/text";
import { loadImportState, writeStory } from "../shared/write";
import { parseTalePage } from "./parse";
import {
  CROM_URL, type CromTale, DEFAULT_MIN_RATING, cromBody, excludedTag, parseCromPage, tagNames, taleUrl, votesFromRating,
} from "./select";

const SOURCE = "scp";
const IMAGES_DIR = join(process.cwd(), "public", "images");
const QUEUE_DIR = join(process.cwd(), ".cache", SOURCE);
const MIN_TEXT_CHARS = 500;

// --- CLI args ---------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(name);
const num = (name: string, def: number) => {
  const i = argv.indexOf(name);
  return i >= 0 ? Number(argv[i + 1]) : def;
};
const MIN_RATING = num("--min-rating", DEFAULT_MIN_RATING);
const LIMIT = num("--limit", Number.MAX_SAFE_INTEGER);
const OFFSET = num("--offset", 0);
const DRY_RUN = flag("--dry-run");

type Skip = { title: string; reason: string };

/** Crom result for the cutoff, paginated once and cached so --offset stays deterministic across resumes. Delete the file to refresh. */
async function loadQueue(minRating: number): Promise<CromTale[]> {
  const path = join(QUEUE_DIR, `crom-${minRating}.json`);
  if (existsSync(path)) {
    return (JSON.parse(readFileSync(path, "utf8")) as CromTale[]).map((t) => ({ ...t, createdAt: new Date(t.createdAt) }));
  }
  const tales: CromTale[] = [];
  let after: string | null = null;
  do {
    const page = parseCromPage(await postJson(CROM_URL, cromBody(minRating, after)));
    tales.push(...page.tales);
    after = page.next;
  } while (after);
  mkdirSync(QUEUE_DIR, { recursive: true });
  writeFileSync(path, JSON.stringify(tales));
  return tales;
}

async function main() {
  const queue = await loadQueue(MIN_RATING);
  console.log(`crom: ${queue.length} tales with rating >= ${MIN_RATING}; limit=${LIMIT} offset=${OFFSET} dry=${DRY_RUN}`);

  const state = await loadImportState("en");
  const skips: Skip[] = [];
  const tagDelta = new Map<string, number>();
  let done = 0, created = 0, updated = 0, imagesOk = 0, imagesFailed = 0, networkSkips = 0;

  for (const tale of queue.slice(OFFSET)) {
    if (done >= LIMIT) break;
    try {
      const result = await importOne(tale);
      if ("skip" in result) { skips.push({ title: tale.title, reason: result.skip }); continue; }
      done++;
      if (result.created) created++; else updated++;
      imagesOk += result.imagesOk; imagesFailed += result.imagesFailed;
      for (const t of result.newTags) tagDelta.set(t, (tagDelta.get(t) ?? 0) + 1);
      if (done % 50 === 0) console.log(`… ${done} +${OFFSET} (${tale.title})`);
    } catch (err) {
      if (err instanceof NetworkError) { networkSkips++; skips.push({ title: tale.title, reason: `network: ${err.message}` }); continue; }
      // Prisma P2028 = transaction timed out over a laggy tunnel; rolled back atomically, safe to retry on re-run.
      if (err && typeof err === "object" && "code" in err && err.code === "P2028") {
        networkSkips++; skips.push({ title: tale.title, reason: `db-timeout: ${String(err)}` }); continue;
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
    tale: CromTale,
  ): Promise<{ skip: string } | { created: boolean; imagesOk: number; imagesFailed: number; newTags: string[] }> {
    const tag = excludedTag(tale.tags);
    if (tag) return { skip: `tag: ${tag}` };

    const url = taleUrl(tale.url);
    const html = await fetchText(url, SOURCE);
    if (!html) return { skip: "not-found" };
    const parsed = parseTalePage(html);
    if (!parsed) return { skip: "not-a-page" };
    if (stripHtml(parsed.bodyHtml).length < MIN_TEXT_CHARS) return { skip: "too-short" };

    const dupSource = state.titleToSource.get(normalizeTitle(tale.title));
    if (dupSource !== undefined && dupSource !== url) return { skip: "duplicate-title" };

    // Images: download originals, rewrite src to /images/<name>; failures stay as
    // /images/<name> so stripMissingImages() hides them at render.
    const srcMap = new Map<string, string>();
    let ok = 0, failed = 0;
    for (const remote of parsed.imageUrls) {
      const name = localImageName(remote, SOURCE);
      srcMap.set(remote, `/images/${name}`);
      if (DRY_RUN) continue;
      if (await downloadFile(remote, join(IMAGES_DIR, name))) ok++; else failed++;
    }
    const contentHtml = rewriteImageSrcs(parsed.bodyHtml, srcMap);

    const { likes, dislikes, score } = votesFromRating(tale.rating, tale.voteCount);
    const names = tagNames(tale.tags);
    const authorName = parsed.bylineAuthor || tale.author;
    const existingId = state.idBySource.get(url);

    if (DRY_RUN) {
      console.log(`  ok    ${String(tale.rating).padStart(5)} ${String(tale.voteCount).padStart(5)} ${tale.createdAt.getUTCFullYear()} ${tale.title}  [${names.join(", ")}]${authorName ? `  by ${authorName}` : ""}`);
      return { created: !existingId, imagesOk: parsed.imageUrls.length, imagesFailed: 0, newTags: [] };
    }

    const { created, newTags } = await writeStory(
      {
        data: {
          title: tale.title,
          intro: parsed.intro,
          contentHtml,
          language: "en",
          status: "APPROVED",
          authorName,
          authorLink: "",
          sourceUrl: url,
          likeCount: likes,
          dislikeCount: dislikes,
          score,
          createdAt: tale.createdAt,
          approvedAt: tale.createdAt,
        },
        likes,
        dislikes,
        voterNamespace: `scp:${tale.wikidotId}`,
        tagNames: names,
      },
      state,
    );
    return { created, imagesOk: ok, imagesFailed: failed, newTags };
  }
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
