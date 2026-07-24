import { notFound } from "next/navigation";

// Catch-all for unknown paths under a locale (e.g. /ru/does-not-exist). Without
// this, unmatched routes fall through to Next's root-level default 404, which
// renders unstyled because the root layout has no NextIntlClientProvider. Calling
// notFound() here routes them to the themed [locale]/not-found.tsx instead.
// More specific routes (/story/[slug], /dossier/[slug], /submit, …) still win.
export default function CatchAllPage() {
  notFound();
}
