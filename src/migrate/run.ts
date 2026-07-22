import { fileURLToPath } from "node:url";
import { writeFile, mkdir } from "node:fs/promises";
import { PrismaClient, type Prisma } from "@prisma/client";
import type { Connection } from "mysql2/promise";
import {
  connectLegacy,
  readStories,
  readTags,
  readStoryRatings,
  ARCHIVE_TABLES,
  readArchive,
} from "./legacy-db";
import {
  unixToDate,
  mapStoryStatus,
  splitTags,
  storySlug,
  sanitizeStoryHtml,
  mapVoteValue,
  hashVoterId,
} from "./transform";
import { slugify } from "../lib/slugify";
import { wilsonScore } from "../lib/scoring/wilson";

const prisma = new PrismaClient();

/** Delete everything this ETL owns so the script is re-runnable. */
export async function clearMigrated(): Promise<void> {
  await prisma.storyTag.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.story.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.legacyArchive.deleteMany();
}

export async function importStoriesAndTags(c: Connection) {
  const legacyTags = await readTags(c);
  const freqByName = new Map(legacyTags.map((t) => [t.name.trim(), t.frequency]));
  const stories = (await readStories(c)).filter(s => s.approved !== 2);

  // --- Stories (dedupe slugs deterministically) ---
  const slugCounts = new Map<string, number>();
  const storyData: Prisma.StoryCreateManyInput[] = stories.map((s) => {
    let slug = storySlug(s.url, s.id);
    const seen = slugCounts.get(slug) ?? 0;
    slugCounts.set(slug, seen + 1);
    if (seen > 0) slug = `${slug}-${s.id}`;
    return {
      slug,
      title: s.title,
      intro: s.intro,
      contentHtml: sanitizeStoryHtml(s.content),
      language: "ru",
      status: mapStoryStatus(s.approved),
      authorName: s.author_name,
      authorLink: s.author_link,
      authorEmail: s.author_email,
      redactor: s.redactor,
      viewCount: s.counter,
      legacyId: s.id,
      legacyIp: s.user_ip && s.user_ip.length > 0 ? s.user_ip : null,
      createdAt: unixToDate(s.create_time),
      approvedAt: s.approve_time > 0 ? unixToDate(s.approve_time) : null,
    };
  });
  await prisma.story.createMany({ data: storyData });

  // --- Tags (unique by transliterated slug) ---
  const tagNames = new Set<string>();
  for (const s of stories) for (const name of splitTags(s.tags)) tagNames.add(name);

  const usedSlugs = new Set<string>();
  const slugByName = new Map<string, string>();
  const tagData: Prisma.TagCreateManyInput[] = [];
  for (const name of tagNames) {
    let slug = slugify(name);
    while (usedSlugs.has(slug)) slug = `${slug}-x`;
    usedSlugs.add(slug);
    slugByName.set(name, slug);
    tagData.push({ slug, name, frequency: freqByName.get(name) ?? 1 });
  }
  await prisma.tag.createMany({ data: tagData });

  // --- Link StoryTag ---
  const storyIdByLegacy = new Map(
    (await prisma.story.findMany({ select: { id: true, legacyId: true } }))
      .filter((r): r is typeof r & { legacyId: number } => r.legacyId !== null)
      .map((r) => [r.legacyId, r.id]),
  );
  const tagIdBySlug = new Map(
    (await prisma.tag.findMany({ select: { id: true, slug: true } })).map((r) => [
      r.slug,
      r.id,
    ]),
  );
  const links: Prisma.StoryTagCreateManyInput[] = [];
  for (const s of stories) {
    const storyId = storyIdByLegacy.get(s.id);
    if (!storyId) continue;
    for (const name of splitTags(s.tags)) {
      const tagId = tagIdBySlug.get(slugByName.get(name)!);
      if (tagId) links.push({ storyId, tagId });
    }
  }
  await prisma.storyTag.createMany({ data: links, skipDuplicates: true });

  return {
    storyIdByLegacy,
    stories: storyData.length,
    tags: tagData.length,
    links: links.length,
  };
}

export async function importVotes(
  c: Connection,
  storyIdByLegacy: Map<number, string>,
) {
  const ratings = await readStoryRatings(c);

  // Dedupe by (storyId, voterId); last row wins (input is ordered by id asc).
  const byKey = new Map<
    string,
    { entityId: string; voterId: string; value: 1 | -1 }
  >();
  let orphans = 0;
  for (const r of ratings) {
    const entityId = storyIdByLegacy.get(r.target_id);
    if (!entityId) {
      orphans++;
      continue;
    }
    const voterId = hashVoterId(r.user);
    byKey.set(`${entityId}:${voterId}`, {
      entityId,
      voterId,
      value: mapVoteValue(r.value),
    });
  }

  const votes: Prisma.VoteCreateManyInput[] = [...byKey.values()].map((v) => ({
    entityType: "STORY",
    entityId: v.entityId,
    voterId: v.voterId,
    value: v.value,
  }));

  for (let i = 0; i < votes.length; i += 5000) {
    await prisma.vote.createMany({
      data: votes.slice(i, i + 5000),
      skipDuplicates: true,
    });
  }

  // Recompute aggregates from the deduped tallies.
  const tally = new Map<string, { likes: number; dislikes: number }>();
  for (const v of votes) {
    const t = tally.get(v.entityId) ?? { likes: 0, dislikes: 0 };
    if (v.value === 1) t.likes++;
    else t.dislikes++;
    tally.set(v.entityId, t);
  }
  for (const [entityId, t] of tally) {
    await prisma.story.update({
      where: { id: entityId },
      data: {
        likeCount: t.likes,
        dislikeCount: t.dislikes,
        score: wilsonScore(t.likes, t.dislikes),
      },
    });
  }

  return { ratings: ratings.length, votes: votes.length, orphans };
}

export async function importArchive(c: Connection): Promise<number> {
  let total = 0;
  for (const table of ARCHIVE_TABLES) {
    const rows = await readArchive(c, table);
    const data: Prisma.LegacyArchiveCreateManyInput[] = rows.map((row) => ({
      sourceTable: table,
      sourceId: Number(row.id),
      data: row as Prisma.InputJsonValue,
    }));
    for (let i = 0; i < data.length; i += 1000) {
      await prisma.legacyArchive.createMany({
        data: data.slice(i, i + 1000),
        skipDuplicates: true,
      });
    }
    total += data.length;
  }
  return total;
}

export async function writeSlugMap(): Promise<number> {
  const stories = await prisma.story.findMany({
    select: { slug: true, legacyId: true },
    orderBy: { legacyId: "asc" },
  });
  const map = stories.map((s) => ({ legacyId: s.legacyId, slug: s.slug }));
  await mkdir("data", { recursive: true });
  await writeFile("data/legacy-slug-map.json", JSON.stringify(map, null, 2));
  return map.length;
}

async function main(): Promise<void> {
  const c = await connectLegacy();
  try {
    console.log("Clearing migrated tables…");
    await clearMigrated();

    const st = await importStoriesAndTags(c);
    console.log(
      `Stories: ${st.stories}  Tags: ${st.tags}  StoryTags: ${st.links}`,
    );

    const vt = await importVotes(c, st.storyIdByLegacy);
    console.log(
      `Ratings: ${vt.ratings}  Votes: ${vt.votes}  Orphans skipped: ${vt.orphans}`,
    );

    const archived = await importArchive(c);
    console.log(`LegacyArchive rows: ${archived}`);

    const mapped = await writeSlugMap();
    console.log(`Slug-map entries: ${mapped} → data/legacy-slug-map.json`);
  } finally {
    await c.end();
    await prisma.$disconnect();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
