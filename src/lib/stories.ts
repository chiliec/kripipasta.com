import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export type StorySort = "popular" | "newest";

export interface StoryListItem {
  id: string;
  slug: string;
  title: string;
  intro: string;
  contentHtml: string;
  score: number;
  viewCount: number;
  likeCount: number;
  dislikeCount: number;
  createdAt: Date;
  approvedAt: Date | null;
  tags: { slug: string; name: string }[];
}

export interface StoryDetail extends StoryListItem {
  language: string;
  authorName: string;
  authorLink: string;
}

export interface StoryListResult {
  items: StoryListItem[];
  total: number;
}

const listSelect = {
  id: true,
  slug: true,
  title: true,
  intro: true,
  contentHtml: true,
  score: true,
  viewCount: true,
  likeCount: true,
  dislikeCount: true,
  createdAt: true,
  approvedAt: true,
  tags: { select: { tag: { select: { slug: true, name: true } } } },
} satisfies Prisma.StorySelect;

const detailSelect = {
  ...listSelect,
  language: true,
  authorName: true,
  authorLink: true,
} satisfies Prisma.StorySelect;

type ListRow = Prisma.StoryGetPayload<{ select: typeof listSelect }>;
type DetailRow = Prisma.StoryGetPayload<{ select: typeof detailSelect }>;

function toListItem(row: ListRow): StoryListItem {
  const { tags, ...rest } = row;
  return { ...rest, tags: tags.map((t) => t.tag) };
}

function toDetail(row: DetailRow): StoryDetail {
  const { tags, ...rest } = row;
  return { ...rest, tags: tags.map((t) => t.tag) };
}

const orderBy: Record<StorySort, Prisma.StoryOrderByWithRelationInput[]> = {
  popular: [{ score: "desc" }, { createdAt: "desc" }],
  newest: [{ approvedAt: "desc" }, { createdAt: "desc" }],
};

export async function getApprovedStories(opts: {
  sort?: StorySort;
  tagSlug?: string;
  skip?: number;
  take?: number;
}): Promise<StoryListResult> {
  const { sort = "popular", tagSlug, skip = 0, take = 9 } = opts;
  const where: Prisma.StoryWhereInput = {
    status: "APPROVED",
    ...(tagSlug ? { tags: { some: { tag: { slug: tagSlug } } } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.story.findMany({
      where,
      select: listSelect,
      orderBy: orderBy[sort],
      skip,
      take,
    }),
    prisma.story.count({ where }),
  ]);
  return { items: rows.map(toListItem), total };
}

export async function getFeaturedStory(): Promise<StoryDetail | null> {
  const row = await prisma.story.findFirst({
    where: { status: "APPROVED" },
    select: detailSelect,
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
  });
  return row ? toDetail(row) : null;
}

export async function getStoryBySlug(slug: string): Promise<StoryDetail | null> {
  const row = await prisma.story.findFirst({
    where: { slug, status: "APPROVED" },
    select: detailSelect,
  });
  return row ? toDetail(row) : null;
}

export async function getRelatedStories(
  story: Pick<StoryDetail, "id" | "tags">,
  take = 3,
): Promise<StoryListItem[]> {
  const tagSlugs = story.tags.map((t) => t.slug);
  if (tagSlugs.length === 0) return [];
  const rows = await prisma.story.findMany({
    where: {
      status: "APPROVED",
      id: { not: story.id },
      tags: { some: { tag: { slug: { in: tagSlugs } } } },
    },
    select: listSelect,
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take,
  });
  return rows.map(toListItem);
}

export async function searchApprovedStories(
  query: string,
  take = 12,
): Promise<StoryListItem[]> {
  // Rank by full-text relevance (GIN-indexed searchVector), tie-break on score.
  const ranked = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM "Story"
    WHERE status = 'APPROVED'
      AND "searchVector" @@ websearch_to_tsquery('russian', ${query})
    ORDER BY ts_rank("searchVector", websearch_to_tsquery('russian', ${query})) DESC,
             score DESC
    LIMIT ${take}
  `;
  if (ranked.length === 0) return [];
  const ids = ranked.map((r) => r.id);
  const rows = await prisma.story.findMany({
    where: { id: { in: ids } },
    select: listSelect,
  });
  const byId = new Map(rows.map((r) => [r.id, toListItem(r)]));
  return ids.map((id) => byId.get(id)).filter((s): s is StoryListItem => !!s);
}

export async function getAllApprovedSlugs(): Promise<string[]> {
  const rows = await prisma.story.findMany({
    where: { status: "APPROVED" },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

export async function getFilterTags(
  take = 8,
): Promise<{ slug: string; name: string }[]> {
  return prisma.tag.findMany({
    orderBy: { frequency: "desc" },
    take,
    select: { slug: true, name: true },
  });
}
