import { prisma } from "@/lib/db";
import type { Prisma, ThreatLevel } from "@prisma/client";

export interface DossierRelatedItem {
  targetSlug: string;
  name: string;
  rel: string;
  threat: number;
}

export interface DossierSectionView {
  anchor: string;
  heading: string;
  bodyHtml: string;
  order: number;
}

export interface DossierImageView {
  image: string;
  caption: string;
  order: number;
}

export interface DossierPopularityPointView {
  year: number;
  value: number;
}

export interface DossierListItem {
  id: string;
  slug: string;
  name: string;
  epithet: string;
  category: string;
  threatLevel: ThreatLevel;
  heroImage: string;
  likeCount: number;
  dislikeCount: number;
  score: number;
}

export interface DossierDetail extends DossierListItem {
  aliases: string[];
  canonStatus: string;
  firstSurfaced: number | null;
  origin: string;
  lead: string;
  threatScore: number;
  dangerScore: number;
  species: string;
  statusText: string;
  creator: string;
  height: string;
  habitat: string;
  popularityCaption: string;
  language: string;
  sections: DossierSectionView[];
  gallery: DossierImageView[];
  popularity: DossierPopularityPointView[];
  related: DossierRelatedItem[];
}

const listSelect = {
  id: true,
  slug: true,
  name: true,
  epithet: true,
  category: true,
  threatLevel: true,
  heroImage: true,
  likeCount: true,
  dislikeCount: true,
  score: true,
} satisfies Prisma.DossierSelect;

const detailSelect = {
  ...listSelect,
  aliases: true,
  canonStatus: true,
  firstSurfaced: true,
  origin: true,
  lead: true,
  threatScore: true,
  dangerScore: true,
  species: true,
  statusText: true,
  creator: true,
  height: true,
  habitat: true,
  popularityCaption: true,
  language: true,
  related: true,
  sections: {
    select: { anchor: true, heading: true, bodyHtml: true, order: true },
    orderBy: { order: "asc" },
  },
  gallery: {
    select: { image: true, caption: true, order: true },
    orderBy: { order: "asc" },
  },
  popularity: {
    select: { year: true, value: true },
    orderBy: { year: "asc" },
  },
} satisfies Prisma.DossierSelect;

type ListRow = Prisma.DossierGetPayload<{ select: typeof listSelect }>;
type DetailRow = Prisma.DossierGetPayload<{ select: typeof detailSelect }>;

function parseRelated(value: unknown): DossierRelatedItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((v) => {
    if (v && typeof v === "object" && "targetSlug" in v) {
      const r = v as Record<string, unknown>;
      return [
        {
          targetSlug: String(r.targetSlug ?? ""),
          name: String(r.name ?? ""),
          rel: String(r.rel ?? ""),
          threat: Number(r.threat ?? 0),
        },
      ];
    }
    return [];
  });
}

function toDetail(row: DetailRow): DossierDetail {
  const { related, ...rest } = row;
  return { ...rest, related: parseRelated(related) };
}

export async function getPublishedDossierBySlug(
  slug: string,
): Promise<DossierDetail | null> {
  const row = await prisma.dossier.findFirst({
    where: { slug, status: "APPROVED" },
    select: detailSelect,
  });
  return row ? toDetail(row) : null;
}

export async function getPublishedDossiers(): Promise<DossierListItem[]> {
  const rows: ListRow[] = await prisma.dossier.findMany({
    where: { status: "APPROVED" },
    select: listSelect,
    orderBy: [{ score: "desc" }, { name: "asc" }],
  });
  return rows;
}

export async function getAllPublishedDossierSlugs(): Promise<string[]> {
  const rows = await prisma.dossier.findMany({
    where: { status: "APPROVED" },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}
