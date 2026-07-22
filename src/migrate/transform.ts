import { createHash } from "node:crypto";
import sanitizeHtml from "sanitize-html";
import { decode } from "he";
import type { ContentStatus } from "@prisma/client";

export function unixToDate(seconds: number): Date {
  return new Date(seconds * 1000);
}

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

const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img",
    "figure",
    "figcaption",
    "iframe",
    "span",
    "h1",
    "h2",
  ]),
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    iframe: ["src", "width", "height", "frameborder", "allowfullscreen"],
    span: ["id"],
  },
  allowedIframeHostnames: [
    "www.youtube.com",
    "youtube.com",
    "player.vimeo.com",
    "vk.com",
  ],
};

/** Decode legacy HTML entities, then strip to a safe allowlist. */
export function sanitizeStoryHtml(raw: string): string {
  return sanitizeHtml(decode(raw), SANITIZE_OPTS);
}
