import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type PendingSource = "all" | "new";

export interface PendingStory {
  id: string;
  slug: string;
  title: string;
  intro: string;
  authorName: string;
  createdAt: Date;
  legacyId: number | null;
  tags: { slug: string; name: string }[];
}

export interface ModerationStory extends PendingStory {
  contentHtml: string;
  authorLink: string;
  authorEmail: string;
}

function pendingWhere(source: PendingSource): Prisma.StoryWhereInput {
  return {
    status: "PENDING",
    ...(source === "new" ? { legacyId: null } : {}),
  };
}

const listSelect = {
  id: true,
  slug: true,
  title: true,
  intro: true,
  authorName: true,
  createdAt: true,
  legacyId: true,
  tags: { select: { tag: { select: { slug: true, name: true } } } },
} satisfies Prisma.StorySelect;

type ListRow = Prisma.StoryGetPayload<{ select: typeof listSelect }>;

function toPending(row: ListRow): PendingStory {
  const { tags, ...rest } = row;
  return { ...rest, tags: tags.map((t) => t.tag) };
}

export async function getPendingStories(opts: {
  source?: PendingSource;
  skip?: number;
  take?: number;
}): Promise<{ items: PendingStory[]; total: number }> {
  const { source = "all", skip = 0, take = 20 } = opts;
  const where = pendingWhere(source);
  const [rows, total] = await Promise.all([
    prisma.story.findMany({
      where,
      select: listSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.story.count({ where }),
  ]);
  return { items: rows.map(toPending), total };
}

export async function getPendingCount(
  source: PendingSource = "all",
): Promise<number> {
  return prisma.story.count({ where: pendingWhere(source) });
}

export async function getStoryForModeration(
  id: string,
): Promise<ModerationStory | null> {
  const row = await prisma.story.findFirst({
    where: { id, status: "PENDING" },
    select: {
      ...listSelect,
      contentHtml: true,
      authorLink: true,
      authorEmail: true,
    },
  });
  if (!row) return null;
  const { tags, ...rest } = row;
  return { ...rest, tags: tags.map((t) => t.tag) };
}

export async function setStoryStatus(
  id: string,
  status: "APPROVED" | "REJECTED",
): Promise<{ slug: string }> {
  return prisma.story.update({
    where: { id },
    data: { status, approvedAt: status === "APPROVED" ? new Date() : null },
    select: { slug: true },
  });
}
