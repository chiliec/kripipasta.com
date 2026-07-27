import { prisma } from "@/lib/db";
import { sanitizeStoryHtml } from "@/lib/sanitize";
import { slugify } from "@/lib/slugify";
import { renderBlocks } from "@/seed/dossier-html";
import type { SeedDossier } from "@/seed/dossier-types";
import { DOSSIERS } from "@/seed/entities";

async function upsertDossier(seed: SeedDossier): Promise<void> {
  const data = {
    name: seed.name,
    aliases: seed.aliases,
    epithet: seed.epithet,
    category: seed.category,
    canonStatus: seed.canonStatus,
    threatLevel: seed.threatLevel,
    threatScore: seed.threatScore,
    dangerScore: seed.dangerScore,
    firstSurfaced: seed.firstSurfaced,
    origin: seed.origin,
    lead: seed.lead,
    species: seed.species,
    statusText: seed.statusText,
    creator: seed.creator,
    height: seed.height,
    habitat: seed.habitat,
    popularityCaption: seed.popularityCaption,
    language: "ru",
    status: "APPROVED" as const,
    related: seed.related,
  };

  const dossier = await prisma.dossier.upsert({
    where: { slug: seed.slug },
    create: { slug: seed.slug, ...data },
    update: data,
    select: { id: true },
  });

  // Children: delete-and-recreate for a clean idempotent re-run.
  await prisma.dossierSection.deleteMany({ where: { dossierId: dossier.id } });
  await prisma.dossierImage.deleteMany({ where: { dossierId: dossier.id } });
  await prisma.popularityPoint.deleteMany({ where: { dossierId: dossier.id } });

  await prisma.dossierSection.createMany({
    data: seed.sections.map((s, order) => ({
      dossierId: dossier.id,
      order,
      anchor: s.anchor || slugify(s.heading),
      heading: s.heading,
      bodyHtml: sanitizeStoryHtml(renderBlocks(s.blocks)),
    })),
  });
  await prisma.dossierImage.createMany({
    data: seed.gallery.map((g, order) => ({
      dossierId: dossier.id,
      image: "",
      caption: g.caption,
      order,
    })),
  });
  await prisma.popularityPoint.createMany({
    data: seed.popularity.map((p) => ({
      dossierId: dossier.id,
      year: p.year,
      value: p.value,
    })),
  });
  console.log(`seeded dossier: ${seed.slug} (${seed.sections.length} sections)`);
}

async function main(): Promise<void> {
  for (const seed of DOSSIERS) {
    await upsertDossier(seed);
  }
  console.log(`dossier seed complete (${DOSSIERS.length} entities)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
