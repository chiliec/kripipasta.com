import { createHash } from "node:crypto";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { stripHtml } from "@/lib/story-display";
import type { Prisma } from "@/generated/prisma/client";
import { BASE_URL, parseHistoryDate, parseRatingTable, parseStoryPage, type RatingRow } from "./parse";
import {
  EXCLUDED_CATEGORIES, deriveVotes, hasAuthorSuffix, historyUrl, normalizeTitle, rankRows,
  tagCategories, uniqueSlug,
} from "./select";
import { localImageName, rewriteImageSrcs } from "./images";
import { NetworkError, downloadFile, fetchText } from "./fetch";

const RATING_URL = `${BASE_URL}/wiki/%D0%A0%D0%B5%D0%B9%D1%82%D0%B8%D0%BD%D0%B3:%D0%9E%D0%B1%D1%89%D0%B8%D0%B9_%D1%80%D0%B5%D0%B9%D1%82%D0%B8%D0%BD%D0%B3`;
const IMAGES_DIR = join(process.cwd(), "public", "images");
const MIN_TEXT_CHARS = 500;

// --- CLI args ---------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(name);
const num = (name: string, def: number) => {
  const i = argv.indexOf(name);
  return i >= 0 ? Number(argv[i + 1]) : def;
};
const LIMIT = num("--limit", 1000);
const OFFSET = num("--offset", 0);
const DRY_RUN = flag("--dry-run");

type Skip = { title: string; reason: string };

async function main() {
  const ratingHtml = await fetchText(RATING_URL);
  if (!ratingHtml) throw new Error("rating table not found");
  const ranked = rankRows(parseRatingTable(ratingHtml));
  console.log(`rating table: ${ranked.length} rows; limit=${LIMIT} offset=${OFFSET} dry=${DRY_RUN}`);

  // Existing state, loaded once.
  const existing = await prisma.story.findMany({ select: { id: true, slug: true, title: true, sourceUrl: true } });
  const takenSlugs = new Set(existing.map((s) => s.slug));
  const titleToSource = new Map(existing.map((s) => [normalizeTitle(s.title), s.sourceUrl]));
  const idBySource = new Map(existing.filter((s) => s.sourceUrl).map((s) => [s.sourceUrl, s.id]));

  const skips: Skip[] = [];
  const tagDelta = new Map<string, number>();
  let done = 0, created = 0, updated = 0, imagesOk = 0, imagesFailed = 0, networkSkips = 0;

  for (const row of ranked.slice(OFFSET)) {
    if (done >= LIMIT) break;
    const sourceUrl = `${BASE_URL}${row.href}`;
    try {
      const result = await importOne(row, sourceUrl);
      if ("skip" in result) { skips.push({ title: row.title, reason: result.skip }); continue; }
      done++;
      if (result.created) created++; else updated++;
      imagesOk += result.imagesOk; imagesFailed += result.imagesFailed;
      for (const t of result.newTags) tagDelta.set(t, (tagDelta.get(t) ?? 0) + 1);
      if (done % 50 === 0) console.log(`… ${done}/${LIMIT} (${row.title})`);
    } catch (err) {
      if (err instanceof NetworkError) { networkSkips++; skips.push({ title: row.title, reason: `network: ${err.message}` }); continue; }
      // Prisma transaction expired (P2028) — seen over a laggy SSH tunnel when a single
      // network stall outlasts the transaction timeout. The transaction itself rolled back
      // atomically, so it's safe to skip and pick back up on a re-run (idempotent by sourceUrl).
      if (err && typeof err === "object" && "code" in err && err.code === "P2028") {
        networkSkips++; skips.push({ title: row.title, reason: `db-timeout: ${String(err)}` }); continue;
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
    row: RatingRow,
    sourceUrl: string,
  ): Promise<{ skip: string } | { created: boolean; imagesOk: number; imagesFailed: number; newTags: string[] }> {
    const html = await fetchText(sourceUrl);
    if (!html) return { skip: "not-found" };
    const parsed = parseStoryPage(html);
    if (!parsed) return { skip: "not-a-story" };

    const excluded = parsed.categories.find((c) => EXCLUDED_CATEGORIES.has(c));
    if (excluded) return { skip: `category: ${excluded}` };
    if (hasAuthorSuffix(parsed.title)) return { skip: "author-suffix" };
    if (stripHtml(parsed.bodyHtml).length < MIN_TEXT_CHARS) return { skip: "too-short" };
    const dupSource = titleToSource.get(normalizeTitle(parsed.title));
    if (dupSource !== undefined && dupSource !== sourceUrl) return { skip: "duplicate-title" };

    const date = parseHistoryDate((await fetchText(historyUrl(row.href))) ?? "") ?? new Date();

    // Images: download originals, rewrite src to /images/<name>; failures stay as
    // /images/<name> so stripMissingImages() hides them at render.
    const srcMap = new Map<string, string>();
    let imagesOk = 0, imagesFailed = 0;
    for (const url of parsed.imageUrls) {
      const name = localImageName(url);
      srcMap.set(url, `/images/${name}`);
      if (DRY_RUN) continue;
      if (await downloadFile(url, join(IMAGES_DIR, name))) imagesOk++; else imagesFailed++;
    }
    const contentHtml = rewriteImageSrcs(parsed.bodyHtml, srcMap);

    const { likes, dislikes, score } = deriveVotes(row.ratingPct, row.votes);
    const tagNames = tagCategories(parsed.categories);
    const existingId = idBySource.get(sourceUrl);

    if (DRY_RUN) {
      console.log(`  ok    ${String(row.ratingPct).padStart(3)}% ${String(row.votes).padStart(5)} ${date.getUTCFullYear()} ${parsed.title}  [${tagNames.join(", ")}]${parsed.authorName ? `  by ${parsed.authorName}` : ""}`);
      return { created: !existingId, imagesOk: parsed.imageUrls.length, imagesFailed: 0, newTags: [] };
    }

    const data = {
      title: parsed.title,
      intro: parsed.intro,
      contentHtml,
      language: "ru",
      status: "APPROVED" as const,
      authorName: parsed.authorName,
      authorLink: parsed.authorLink,
      sourceUrl,
      likeCount: likes,
      dislikeCount: dislikes,
      score,
      createdAt: date,
      approvedAt: date,
    };

    const newTags: string[] = [];
    await prisma.$transaction(async (tx) => {
      let storyId = existingId;
      if (storyId) {
        await tx.story.update({ where: { id: storyId }, data });
      } else {
        const slug = uniqueSlug(slugify(parsed.title), takenSlugs);
        storyId = (await tx.story.create({ data: { ...data, slug }, select: { id: true } })).id;
        idBySource.set(sourceUrl, storyId);
        titleToSource.set(normalizeTitle(parsed.title), sourceUrl);

        const votes: Prisma.VoteCreateManyInput[] = [];
        for (let i = 0; i < likes + dislikes; i++) {
          votes.push({
            entityType: "STORY",
            entityId: storyId,
            voterId: createHash("sha256").update(`mrakopedia:${parsed.pid}:${i}`).digest("hex"),
            value: i < likes ? 1 : -1,
          });
        }
        for (let i = 0; i < votes.length; i += 2000) {
          await tx.vote.createMany({ data: votes.slice(i, i + 2000), skipDuplicates: true });
        }
      }

      for (const name of tagNames) {
        const slug = slugify(name);
        const tag = await tx.tag.upsert({
          where: { slug },
          create: { slug, name, frequency: 0 },
          update: {},
          select: { id: true },
        });
        const link = await tx.storyTag.createMany({ data: [{ storyId, tagId: tag.id }], skipDuplicates: true });
        if (link.count > 0) newTags.push(slug);
      }
    }, { timeout: 180_000 }); // up to ~10k vote rows per story; 30s wasn't enough over a laggy SSH tunnel in practice

    return { created: !existingId, imagesOk, imagesFailed, newTags };
  }
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
