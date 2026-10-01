import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/seo";
import { getAllApprovedSlugs } from "@/lib/stories";
import { getAllPublishedDossierSlugs } from "@/lib/dossiers";
import { buildSafe } from "@/lib/build-safe";

// Query the live DB per request. As a param-less route this would otherwise be
// prerendered empty on the DB-less build server and serve that stale snapshot.
export const dynamic = "force-dynamic";

// Indexable static routes, as locale-agnostic paths ("" == home).
const STATIC_PATHS = ["", "/dossier", "/submit"];

function entry(path: string): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `${SITE_URL}/${l}${path}`;
  return {
    url: `${SITE_URL}/${routing.defaultLocale}${path}`,
    alternates: { languages },
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.6,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [dossierSlugs, ...storySlugsByLocale] = await Promise.all([
    buildSafe<string[]>(() => getAllPublishedDossierSlugs(), []),
    ...routing.locales.map((l) => buildSafe<string[]>(() => getAllApprovedSlugs(l), [])),
  ]);

  // Stories exist in one language only: list each under its own locale, no hreflang alternates.
  const stories: MetadataRoute.Sitemap = routing.locales.flatMap((l, i) =>
    storySlugsByLocale[i].map((slug) => ({
      url: `${SITE_URL}/${l}/story/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  );

  return [
    ...[...STATIC_PATHS, ...dossierSlugs.map((s) => `/dossier/${s}`)].map(entry),
    ...stories,
  ];
}
