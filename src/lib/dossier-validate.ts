import { slugify } from "@/lib/slugify";
import { sanitizeStoryHtml } from "@/lib/sanitize";
import type { DossierRelatedItem } from "@/lib/dossiers";

const THREAT_LEVELS = ["LOW", "MODERATE", "HIGH", "SEVERE", "EXTREME"] as const;
type ThreatLevelStr = (typeof THREAT_LEVELS)[number];

export interface DossierFormInput {
  name: string;
  slug: string;
  epithet: string;
  category: string;
  canonStatus: string;
  aliases: string;
  threatLevel: string;
  threatScore: string;
  dangerScore: string;
  firstSurfaced: string;
  origin: string;
  lead: string;
  species: string;
  statusText: string;
  creator: string;
  height: string;
  habitat: string;
  popularityCaption: string;
  sectionHeading: string[];
  sectionBody: string[];
  galleryCaption: string[];
  popYear: string[];
  popValue: string[];
  relatedLines: string;
}

export interface ValidatedDossier {
  name: string;
  slug: string;
  epithet: string;
  category: string;
  canonStatus: string;
  aliases: string[];
  threatLevel: ThreatLevelStr;
  threatScore: number;
  dangerScore: number;
  firstSurfaced: number | null;
  origin: string;
  lead: string;
  species: string;
  statusText: string;
  creator: string;
  height: string;
  habitat: string;
  popularityCaption: string;
  sections: { anchor: string; heading: string; bodyHtml: string }[];
  gallery: { caption: string }[];
  popularity: { year: number; value: number }[];
  related: DossierRelatedItem[];
}

export type DossierValidationResult =
  | { ok: true; data: ValidatedDossier }
  | { ok: false; errors: Record<string, string> };

function clamp0to100(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function csv(raw: string): string[] {
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function parseRelatedLines(raw: string): DossierRelatedItem[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length < 4) return [];
      const threat = Number(parts[3]);
      if (!parts[0] || !Number.isFinite(threat)) return [];
      return [{ targetSlug: parts[0], name: parts[1], rel: parts[2], threat }];
    });
}

export function validateDossier(input: DossierFormInput): DossierValidationResult {
  const name = input.name.trim();
  const errors: Record<string, string> = {};

  if (name.length < 2) errors.name = "Название обязательно (минимум 2 символа).";
  if (!THREAT_LEVELS.includes(input.threatLevel as ThreatLevelStr))
    errors.threatLevel = "Некорректный уровень угрозы.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const slug = input.slug.trim() ? slugify(input.slug) : slugify(name);
  const firstSurfacedNum = Number(input.firstSurfaced);
  const firstSurfaced =
    input.firstSurfaced.trim() && Number.isFinite(firstSurfacedNum)
      ? Math.round(firstSurfacedNum)
      : null;

  const sections = input.sectionHeading
    .map((heading, i) => ({ heading: heading.trim(), body: input.sectionBody[i] ?? "" }))
    .filter((s) => s.heading.length > 0)
    .map((s) => ({
      anchor: slugify(s.heading),
      heading: s.heading,
      bodyHtml: sanitizeStoryHtml(s.body),
    }));

  const gallery = input.galleryCaption
    .map((c) => c.trim())
    .filter(Boolean)
    .map((caption) => ({ caption }));

  const popularity = input.popYear
    .map((y, i) => ({ year: Number(y), value: Number(input.popValue[i]) }))
    .filter((p) => Number.isFinite(p.year) && Number.isFinite(p.value))
    .map((p) => ({ year: Math.round(p.year), value: clamp0to100(String(p.value)) }));

  return {
    ok: true,
    data: {
      name,
      slug,
      epithet: input.epithet.trim(),
      category: input.category.trim(),
      canonStatus: input.canonStatus.trim(),
      aliases: csv(input.aliases),
      threatLevel: input.threatLevel as ThreatLevelStr,
      threatScore: clamp0to100(input.threatScore),
      dangerScore: clamp0to100(input.dangerScore),
      firstSurfaced,
      origin: input.origin.trim(),
      lead: input.lead.trim(),
      species: input.species.trim(),
      statusText: input.statusText.trim(),
      creator: input.creator.trim(),
      height: input.height.trim(),
      habitat: input.habitat.trim(),
      popularityCaption: input.popularityCaption.trim(),
      sections,
      gallery,
      popularity,
      related: parseRelatedLines(input.relatedLines),
    },
  };
}
