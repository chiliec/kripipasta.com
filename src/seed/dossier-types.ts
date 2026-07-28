import type { ThreatLevel } from "@/generated/prisma/client";
import type { Block } from "@/seed/dossier-html";

export interface SeedSection {
  anchor: string;
  heading: string;
  blocks: Block[];
}

export type SeedRelated = {
  targetSlug: string;
  name: string;
  rel: string;
  threat: number;
};

export interface SeedDossier {
  slug: string;
  name: string;
  aliases: string[];
  epithet: string;
  category: string;
  canonStatus: string;
  threatLevel: ThreatLevel;
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
  /** Site-absolute path under public/images (e.g. "/images/dossier-jeff-the-killer.jpg"). */
  heroImage?: string;
  sections: SeedSection[];
  gallery: { image?: string; caption: string }[];
  popularity: { year: number; value: number }[];
  related: SeedRelated[];
}
