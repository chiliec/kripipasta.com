/**
 * Recover inline story images that were never migrated from the legacy site.
 *
 * Legacy story/dossier HTML references images by relative path (/images/<name>),
 * but the files were never carried into public/images/, so they 404 in prod.
 * The originals survive on the Wayback Machine. This script extracts every
 * /images/* path referenced by *published* content (APPROVED stories + dossier
 * sections), then downloads any missing file from archive.org into public/images/
 * at the same relative path — so the existing relative src resolves with no
 * content or ETL changes.
 *
 * Idempotent: files already present in public/images/ are skipped.
 * Run: npx tsx --env-file=.env src/migrate/recover-images.ts
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PUBLIC_DIR = join(process.cwd(), "public");
const IMG_RE = /\/images\/[A-Za-z0-9._\-\/]+\.(?:jpe?g|png|gif|webp)/gi;
// "id_" asks Wayback for the raw original (no rewrite banner); 2 = closest snapshot.
const wayback = (path: string) =>
  `http://web.archive.org/web/2id_/https://kripipasta.com${path}`;

async function collectRefs(): Promise<string[]> {
  const stories = await prisma.story.findMany({
    where: { status: "APPROVED" },
    select: { contentHtml: true, intro: true },
  });
  const sections = await prisma.dossierSection.findMany({ select: { bodyHtml: true } });
  const set = new Set<string>();
  const scan = (s: string) => { for (const m of s.matchAll(IMG_RE)) set.add(m[0]); };
  for (const s of stories) { scan(s.contentHtml); scan(s.intro); }
  for (const d of sections) scan(d.bodyHtml);
  return [...set].sort();
}

async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

async function main() {
  const refs = await collectRefs();
  console.log(`Found ${refs.length} distinct published image refs.\n`);
  let ok = 0, skipped = 0;
  const failed: string[] = [];
  for (const ref of refs) {
    const dest = join(PUBLIC_DIR, ref.replace(/^\//, ""));
    if (await exists(dest)) { console.log(`skip  ${ref} (already present)`); skipped++; continue; }
    try {
      const res = await fetch(wayback(ref), { redirect: "follow" });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.startsWith("image/")) {
        throw new Error(`HTTP ${res.status} type=${type || "none"}`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, buf);
      console.log(`ok    ${ref} (${(buf.length / 1024).toFixed(0)} KB, ${type})`);
      ok++;
    } catch (e) {
      console.log(`FAIL  ${ref} — ${(e as Error).message}`);
      failed.push(ref);
    }
  }
  console.log(`\nDone. recovered=${ok} skipped=${skipped} failed=${failed.length}`);
  if (failed.length) console.log("Failed:\n" + failed.map((f) => "  " + f).join("\n"));
}

main().finally(() => prisma.$disconnect());
