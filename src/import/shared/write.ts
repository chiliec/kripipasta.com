import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import type { Prisma } from "@/generated/prisma/client";
import { normalizeTitle, uniqueSlug } from "./text";

export interface ImportState {
  takenSlugs: Set<string>;
  /** sourceUrl → story id */
  idBySource: Map<string, string>;
  /** normalizeTitle(title) → sourceUrl ("" for non-imported stories) */
  titleToSource: Map<string, string>;
}

/** Existing DB state, loaded once per run. Title dedupe is per language; slugs are global. */
export async function loadImportState(language: string): Promise<ImportState> {
  const existing = await prisma.story.findMany({
    select: { id: true, slug: true, title: true, sourceUrl: true, language: true },
  });
  return {
    takenSlugs: new Set(existing.map((s) => s.slug)),
    idBySource: new Map(existing.filter((s) => s.sourceUrl).map((s) => [s.sourceUrl, s.id])),
    titleToSource: new Map(
      existing.filter((s) => s.language === language).map((s) => [normalizeTitle(s.title), s.sourceUrl]),
    ),
  };
}

export type StoryData = Pick<
  Prisma.StoryUncheckedCreateInput,
  | "title" | "intro" | "contentHtml" | "language" | "status" | "authorName" | "authorLink"
  | "sourceUrl" | "likeCount" | "dislikeCount" | "score" | "createdAt" | "approvedAt"
>;

export interface WriteStoryInput {
  data: StoryData & { title: string; sourceUrl: string };
  likes: number;
  dislikes: number;
  /** Namespace for synthetic voterIds, e.g. "mrakopedia:25939"; voterId = sha256(`${ns}:${i}`). */
  voterNamespace: string;
  tagNames: string[];
}

/**
 * Upsert one imported story by sourceUrl inside a single transaction.
 * Votes are created on first insert only; re-runs update fields and tags.
 */
export async function writeStory(
  { data, likes, dislikes, voterNamespace, tagNames }: WriteStoryInput,
  state: ImportState,
): Promise<{ created: boolean; newTags: string[] }> {
  const existingId = state.idBySource.get(data.sourceUrl);
  const newTags: string[] = [];

  await prisma.$transaction(async (tx) => {
    let storyId = existingId;
    if (storyId) {
      await tx.story.update({ where: { id: storyId }, data });
    } else {
      const slug = uniqueSlug(slugify(data.title), state.takenSlugs);
      storyId = (await tx.story.create({ data: { ...data, slug }, select: { id: true } })).id;
      state.idBySource.set(data.sourceUrl, storyId);
      state.titleToSource.set(normalizeTitle(data.title), data.sourceUrl);

      const votes: Prisma.VoteCreateManyInput[] = [];
      for (let i = 0; i < likes + dislikes; i++) {
        votes.push({
          entityType: "STORY",
          entityId: storyId,
          voterId: createHash("sha256").update(`${voterNamespace}:${i}`).digest("hex"),
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

  return { created: !existingId, newTags };
}
