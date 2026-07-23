import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import type { ValidatedDossier } from "@/lib/dossier-validate";
import type { DossierDetail } from "@/lib/dossiers";
import type { Prisma } from "@prisma/client";

export interface AdminDossierListItem {
  id: string;
  slug: string;
  name: string;
  status: string;
  threatLevel: string;
  updatedAt: Date;
}

export async function listAllDossiers(): Promise<AdminDossierListItem[]> {
  return prisma.dossier.findMany({
    select: { id: true, slug: true, name: true, status: true, threatLevel: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function generateUniqueDossierSlug(
  base: string,
  exceptId?: string,
): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  let n = 2;
  for (;;) {
    const existing = await prisma.dossier.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === exceptId) return candidate;
    candidate = `${root}-${n++}`;
  }
}

function scalarData(data: ValidatedDossier) {
  return {
    name: data.name,
    epithet: data.epithet,
    category: data.category,
    canonStatus: data.canonStatus,
    aliases: data.aliases,
    threatLevel: data.threatLevel,
    threatScore: data.threatScore,
    dangerScore: data.dangerScore,
    firstSurfaced: data.firstSurfaced,
    origin: data.origin,
    lead: data.lead,
    species: data.species,
    statusText: data.statusText,
    creator: data.creator,
    height: data.height,
    habitat: data.habitat,
    popularityCaption: data.popularityCaption,
    related: data.related as unknown as Prisma.InputJsonValue,
  };
}

function childCreate(data: ValidatedDossier) {
  return {
    sections: {
      create: data.sections.map((s, order) => ({
        order,
        anchor: s.anchor,
        heading: s.heading,
        bodyHtml: s.bodyHtml,
      })),
    },
    gallery: {
      create: data.gallery.map((g, order) => ({ image: "", caption: g.caption, order })),
    },
    popularity: {
      create: data.popularity.map((p) => ({ year: p.year, value: p.value })),
    },
  };
}

export async function createDossier(
  data: ValidatedDossier,
): Promise<{ id: string; slug: string }> {
  const slug = await generateUniqueDossierSlug(data.slug);
  const row = await prisma.dossier.create({
    data: {
      slug,
      language: "ru",
      status: "DRAFT",
      ...scalarData(data),
      ...childCreate(data),
    },
    select: { id: true, slug: true },
  });
  return row;
}

export async function updateDossier(
  id: string,
  data: ValidatedDossier,
): Promise<{ id: string; slug: string } | null> {
  const existing = await prisma.dossier.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  const slug = await generateUniqueDossierSlug(data.slug, id);
  return prisma.$transaction(async (tx) => {
    await tx.dossierSection.deleteMany({ where: { dossierId: id } });
    await tx.dossierImage.deleteMany({ where: { dossierId: id } });
    await tx.popularityPoint.deleteMany({ where: { dossierId: id } });
    return tx.dossier.update({
      where: { id },
      data: { slug, ...scalarData(data), ...childCreate(data) },
      select: { id: true, slug: true },
    });
  });
}

export async function setDossierStatus(
  id: string,
  status: "APPROVED" | "DRAFT",
): Promise<{ slug: string } | null> {
  try {
    return await prisma.dossier.update({
      where: { id },
      data: { status },
      select: { slug: true },
    });
  } catch (e: unknown) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code === "P2025") {
      return null;
    }
    throw e;
  }
}

const editSelect = {
  id: true, slug: true, name: true, epithet: true, category: true, canonStatus: true,
  aliases: true, threatLevel: true, threatScore: true, dangerScore: true,
  firstSurfaced: true, origin: true, heroImage: true, lead: true, species: true,
  statusText: true, creator: true, height: true, habitat: true, popularityCaption: true,
  language: true, likeCount: true, dislikeCount: true, score: true, related: true,
  sections: { select: { anchor: true, heading: true, bodyHtml: true, order: true }, orderBy: { order: "asc" as const } },
  gallery: { select: { image: true, caption: true, order: true }, orderBy: { order: "asc" as const } },
  popularity: { select: { year: true, value: true }, orderBy: { year: "asc" as const } },
} satisfies Prisma.DossierSelect;

export async function getDossierForEdit(id: string): Promise<DossierDetail | null> {
  const row = await prisma.dossier.findUnique({ where: { id }, select: editSelect });
  if (!row) return null;
  const related = Array.isArray(row.related)
    ? (row.related as unknown as DossierDetail["related"])
    : [];
  return { ...row, related } as DossierDetail;
}
