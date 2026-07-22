import { createHash } from "node:crypto";
import type { ContentStatus } from "@prisma/client";

export { sanitizeStoryHtml } from "@/lib/sanitize";

export function unixToDate(seconds: number): Date {
  return new Date(seconds * 1000);
}

/** Maps legacy approved field. Only approved===1 (editorial picks) → APPROVED; callers must pre-filter approved=2. */
export function mapStoryStatus(approved: number): ContentStatus {
  return approved === 1 ? "APPROVED" : "PENDING";
}

export function mapVoteValue(value: number): 1 | -1 {
  return value === 1 ? 1 : -1;
}

export function splitTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function hashVoterId(ip: string): string {
  return createHash("sha256").update(`legacy:${ip}`).digest("hex");
}

export function storySlug(url: string, legacyId: number): string {
  const s = url.trim();
  return s.length > 0 ? s : `story-${legacyId}`;
}
