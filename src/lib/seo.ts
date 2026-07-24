import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

// Canonical production origin. Kept as a literal (not env-derived) because the
// site is single-host and this value also seeds metadataBase for OG/canonical URLs.
export const SITE_URL = "https://kripipasta.com";

export const SITE_NAME = "Kripipasta";

/**
 * Build Next `alternates` (canonical + hreflang languages) for a locale-agnostic
 * route. `path` excludes the locale prefix and leading segment marker, e.g.
 * "" for the home page, "/story/foo" for a story. Values are relative; Next
 * resolves them against `metadataBase` into absolute URLs.
 */
export function alternates(locale: string, path = ""): Metadata["alternates"] {
  const p = path === "/" ? "" : path;
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `/${l}${p}`;
  languages["x-default"] = `/${routing.defaultLocale}${p}`;
  return { canonical: `/${locale}${p}`, languages };
}

/** OpenGraph locale tag from a next-intl locale code. */
export function ogLocale(locale: string): string {
  return locale === "ru" ? "ru_RU" : "en_US";
}
