import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const stories = await prisma.story.findMany({
      where: { status: "APPROVED", legacyId: { not: null } },
      select: { legacyId: true, slug: true },
      orderBy: { legacyId: "asc" },
    });

    const map: Record<string, string> = {};
    for (const story of stories) {
      if (story.legacyId !== null) {
        map[String(story.legacyId)] = story.slug;
      }
    }

    const outPath = path.resolve(process.cwd(), "data/legacy-redirects.json");
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, JSON.stringify(map, null, 2) + "\n", "utf-8");
    console.log(`Wrote ${Object.keys(map).length} entries to ${outPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
