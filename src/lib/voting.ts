import { prisma } from "@/lib/db";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { wilsonScore } from "@/lib/scoring/wilson";

export type VoteEntityType = "STORY" | "DOSSIER";
/** -1 dislike, 0 no vote (clear), +1 like. */
export type VoteValue = -1 | 0 | 1;

export interface VoteAggregate {
  likeCount: number;
  dislikeCount: number;
  score: number; // Wilson lower-bound in [0,1]
  myVote: VoteValue;
}

export class VoteInputError extends Error {}

const ENTITY_TYPES: VoteEntityType[] = ["STORY", "DOSSIER"];

export function parseEntityType(value: unknown): VoteEntityType {
  if (typeof value === "string" && ENTITY_TYPES.includes(value as VoteEntityType)) {
    return value as VoteEntityType;
  }
  throw new VoteInputError("Invalid entityType");
}

export function parseVoteValue(value: unknown): VoteValue {
  if (value === 1 || value === -1 || value === 0) return value;
  throw new VoteInputError("Invalid vote value");
}

type TxClient = Prisma.TransactionClient | PrismaClient;

const countsSelect = {
  likeCount: true,
  dislikeCount: true,
  score: true,
} as const;

async function readEntityCounts(
  tx: TxClient,
  entityType: VoteEntityType,
  entityId: string,
): Promise<{ likeCount: number; dislikeCount: number; score: number } | null> {
  const row =
    entityType === "STORY"
      ? await tx.story.findUnique({ where: { id: entityId }, select: countsSelect })
      : await tx.dossier.findUnique({ where: { id: entityId }, select: countsSelect });
  return row ?? null;
}

async function writeEntityCounts(
  tx: TxClient,
  entityType: VoteEntityType,
  entityId: string,
  data: { likeCount: number; dislikeCount: number; score: number },
): Promise<void> {
  if (entityType === "STORY") {
    await tx.story.update({ where: { id: entityId }, data });
  } else {
    await tx.dossier.update({ where: { id: entityId }, data });
  }
}

/** Read the aggregate rating for an entity plus this voter's own vote. */
export async function getVoteState(args: {
  entityType: VoteEntityType;
  entityId: string;
  voterId?: string;
}): Promise<VoteAggregate | null> {
  const { entityType, entityId, voterId } = args;
  const counts = await readEntityCounts(prisma, entityType, entityId);
  if (!counts) return null;

  let myVote: VoteValue = 0;
  if (voterId) {
    const vote = await prisma.vote.findUnique({
      where: { entityType_entityId_voterId: { entityType, entityId, voterId } },
      select: { value: true },
    });
    if (vote) myVote = parseVoteValue(vote.value);
  }
  return { ...counts, myVote };
}

/**
 * Set (or clear, when value=0) a voter's vote and recompute the entity's
 * like/dislike counts and Wilson score. Idempotent per (entity, voter).
 * Returns null if the entity does not exist.
 */
export async function applyVote(args: {
  entityType: VoteEntityType;
  entityId: string;
  voterId: string;
  value: VoteValue;
}): Promise<VoteAggregate | null> {
  const { entityType, entityId, voterId, value } = args;
  if (!entityId) throw new VoteInputError("Missing entityId");
  if (!voterId) throw new VoteInputError("Missing voterId");

  return prisma.$transaction(async (tx) => {
    const exists = await readEntityCounts(tx, entityType, entityId);
    if (!exists) return null;

    const key = { entityType_entityId_voterId: { entityType, entityId, voterId } };
    if (value === 0) {
      await tx.vote.deleteMany({ where: { entityType, entityId, voterId } });
    } else {
      await tx.vote.upsert({
        where: key,
        create: { entityType, entityId, voterId, value },
        update: { value },
      });
    }

    const grouped = await tx.vote.groupBy({
      by: ["value"],
      where: { entityType, entityId },
      _count: { _all: true },
    });
    const countFor = (v: number) =>
      grouped.find((g) => g.value === v)?._count._all ?? 0;
    const likeCount = countFor(1);
    const dislikeCount = countFor(-1);
    const score = wilsonScore(likeCount, dislikeCount);

    await writeEntityCounts(tx, entityType, entityId, {
      likeCount,
      dislikeCount,
      score,
    });

    return { likeCount, dislikeCount, score, myVote: value };
  });
}
