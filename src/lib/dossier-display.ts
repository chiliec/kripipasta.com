import type { ThreatLevel } from "@prisma/client";
import { dossierPopularity100 } from "@/lib/scoring/display";
import type { DossierDetail } from "@/lib/dossiers";

const THREAT_KEYS: Record<ThreatLevel, string> = {
  LOW: "threatLow",
  MODERATE: "threatModerate",
  HIGH: "threatHigh",
  SEVERE: "threatSevere",
  EXTREME: "threatExtreme",
};

export function threatLevelKey(level: ThreatLevel): string {
  return THREAT_KEYS[level];
}

export function dossierScore100(score: number): number {
  return dossierPopularity100(score);
}

export interface TocBlock {
  anchor: string;
  /** Empty string means "render the section's own heading". */
  labelKey: string;
}

/**
 * Canonical block order mirrors the mockup's tocLabels. Prose sections keep
 * their seeded order; the special blocks are inserted after their anchoring
 * prose section only when they carry content.
 */
export function buildDossierToc(d: DossierDetail): TocBlock[] {
  const blocks: TocBlock[] = [];
  for (const s of d.sections) {
    blocks.push({ anchor: s.anchor, labelKey: "" });
    if (s.anchor === "encounters" && d.gallery.length > 0)
      blocks.push({ anchor: "gallery", labelKey: "tocGallery" });
    if (s.anchor === "gallery-placeholder") continue;
  }
  // Fallback insertion when the anchoring section is absent: append special
  // blocks in canonical order after the prose list.
  if (d.gallery.length > 0 && !blocks.some((b) => b.anchor === "gallery"))
    blocks.push({ anchor: "gallery", labelKey: "tocGallery" });
  if (d.popularity.length > 0)
    blocks.push({ anchor: "popularity", labelKey: "tocPopularity" });
  if (d.related.length > 0)
    blocks.push({ anchor: "related", labelKey: "tocRelated" });
  return blocks;
}
