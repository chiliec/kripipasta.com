import { fileURLToPath } from "node:url";
import { PrismaClient, type Prisma } from "@prisma/client";
import type { Connection } from "mysql2/promise";
import {
  connectLegacy,
  readStories,
  readTags,
} from "./legacy-db";
import {
  unixToDate,
  mapStoryStatus,
  splitTags,
  storySlug,
  sanitizeStoryHtml,
} from "./transform";
import { slugify } from "../lib/slugify";

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

async function main(): Promise<void> {
  const c = await connectLegacy();
  try {
    console.log("Clearing migrated tables…");
    await clearMigrated();

    const st = await importStoriesAndTags(c);
    console.log(
      `Stories: ${st.stories}  Tags: ${st.tags}  StoryTags: ${st.links}`,
    );
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
