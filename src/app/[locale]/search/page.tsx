import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import StoryCard from "@/components/StoryCard";
import DossierCard from "@/components/DossierCard";
import { search } from "@/lib/search";
import { buildSafe } from "@/lib/build-safe";
import { alternates } from "@/lib/seo";

// Results depend on the ?q= query param, so this page must render per-request.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  return {
    title: t("eyebrow"),
    alternates: alternates(locale, "/search"),
    // Query-parameterized result pages add no index value; keep the base page
    // canonical but tell crawlers not to index ?q= permutations.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("search");

  const { q } = await searchParams;
  const results = await buildSafe(() => search(q), null);

  return (
    <>
      <SiteHeader />
      <main className="pt-16">
        <div className="mx-auto max-w-shell px-6 py-12 md:px-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-crimson-2">
            {t("eyebrow")}
          </p>

          {!results ? (
            <>
              <h1 className="mt-2 font-serif text-[clamp(30px,5vw,60px)] font-medium text-ink">
                {t("promptHeading")}
              </h1>
              <p className="mt-3 max-w-prose text-tx2">{t("prompt")}</p>
            </>
          ) : (
            <>
              <h1 className="mt-2 font-serif text-[clamp(30px,5vw,60px)] font-medium text-ink">
                {t("resultsHeading")}{" "}
                <span className="text-tx2">
                  {t("resultsFor", { query: results.query })}
                </span>
              </h1>
              <p className="mt-3 font-mono text-[11px] text-tx3">
                {t("countTemplate", { total: results.total })}
              </p>

              {results.total === 0 ? (
                <p className="mt-12 text-tx2">
                  {t("empty", { query: results.query })}
                </p>
              ) : (
                <div className="mt-10 space-y-14">
                  {results.stories.length > 0 && (
                    <section>
                      <h2 className="font-mono text-[12px] uppercase tracking-[0.2em] text-tx3">
                        {t("storiesHeading")}
                      </h2>
                      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {results.stories.map((story) => (
                          <StoryCard key={story.id} story={story} />
                        ))}
                      </div>
                    </section>
                  )}

                  {results.dossiers.length > 0 && (
                    <section>
                      <h2 className="font-mono text-[12px] uppercase tracking-[0.2em] text-tx3">
                        {t("dossiersHeading")}
                      </h2>
                      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {results.dossiers.map((d) => (
                          <DossierCard key={d.id} dossier={d} />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
