import { PrismaClient } from "@prisma/client";
import { wilsonScore } from "../lib/scoring/wilson";

const prisma = new PrismaClient();

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

async function main(): Promise<void> {
  const failures: string[] = [];
  try {
    const stories = await prisma.story.count();
    if (stories !== 9681) failures.push(`Story count ${stories} != 9681`);

    const badVotes = await prisma.vote.count({ where: { value: { notIn: [1, -1] } } });
    if (badVotes > 0) failures.push(`${badVotes} votes with value not in {1,-1}`);

    const orphanVotes = await prisma.vote.findMany({
      where: { entityType: "STORY" },
      select: { entityId: true },
      take: 100,
    });
    const ids = new Set(orphanVotes.map((v) => v.entityId));
    const present = await prisma.story.count({ where: { id: { in: [...ids] } } });
    if (present !== ids.size)
      failures.push(`Some votes reference missing stories (${present}/${ids.size})`);

    const sample = await prisma.story.findMany({
      where: { OR: [{ likeCount: { gt: 0 } }, { dislikeCount: { gt: 0 } }] },
      take: 50,
      select: { slug: true, likeCount: true, dislikeCount: true, score: true },
    });
    for (const s of sample) {
      const expected = round6(wilsonScore(s.likeCount, s.dislikeCount));
      if (round6(s.score) !== expected)
        failures.push(`Story ${s.slug}: score ${round6(s.score)} != ${expected}`);
    }

    const archive = await prisma.legacyArchive.count();

    if (failures.length > 0) {
      console.error("VERIFY FAILED:\n" + failures.join("\n"));
      process.exit(1);
    }
    console.log(
      `VERIFY OK — ${stories} stories, ${sample.length} aggregates checked, ${archive} archive rows`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
