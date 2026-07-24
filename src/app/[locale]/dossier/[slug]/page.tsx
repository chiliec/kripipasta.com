import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ReadingProgress from "@/components/ReadingProgress";
import VotePanel from "@/components/VotePanel";
import DossierFacts from "@/components/DossierFacts";
import DossierToc from "@/components/DossierToc";
import PopularityChart from "@/components/PopularityChart";
import RelatedEntities from "@/components/RelatedEntities";
import {
  getPublishedDossierBySlug,
  getAllPublishedDossierSlugs,
} from "@/lib/dossiers";
import { threatLevelKey, dossierScore100 } from "@/lib/dossier-display";
import { buildSafe } from "@/lib/build-safe";
import JsonLd from "@/components/JsonLd";
import { SITE_NAME, SITE_URL, alternates } from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await buildSafe<string[]>(
    () => getAllPublishedDossierSlugs(),
    [],
  );
  return routing.locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const dossier = await getPublishedDossierBySlug(slug);
  if (!dossier) {
    const t = await getTranslations({ locale, namespace: "notFound" });
    return { title: t("heading") };
  }
  return {
    title: dossier.name,
    description: dossier.lead,
    alternates: alternates(locale, `/dossier/${slug}`),
    openGraph: {
      title: dossier.name,
      description: dossier.lead,
      type: "article",
      url: `/${locale}/dossier/${slug}`,
    },
  };
}

export default async function DossierPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dossier");

  const dossier = await getPublishedDossierBySlug(slug);
  if (!dossier) notFound();

  const knownSlugs = await getAllPublishedDossierSlugs();
  const threat = t(threatLevelKey(dossier.threatLevel));
  const pop = dossierScore100(dossier.score);

  const canonical = `${SITE_URL}/${locale}/dossier/${slug}`;
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: dossier.name,
    description: dossier.lead,
    inLanguage: locale,
    publisher: { "@type": "Organization", name: SITE_NAME },
    image: `${canonical}/opengraph-image`,
    mainEntityOfPage: canonical,
    url: canonical,
  };

  return (
    <>
      <JsonLd data={articleLd} />
      <ReadingProgress />
      <SiteHeader />
      <main className="pt-16">
        <article className="mx-auto max-w-shell px-6 md:px-10">
          <div className="pt-10">
            <Link href="/dossier" className="font-mono text-[11px] text-tx3 hover:text-ink">
              {t("backToArchive")}
            </Link>
          </div>

          <header className="py-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-crimson-2">
              {dossier.category}
            </p>
            <h1 className="mt-5 font-serif text-[clamp(40px,7vw,96px)] font-medium leading-[0.95] text-ink">
              {dossier.name}
            </h1>
            {dossier.epithet && (
              <p className="mt-4 font-serif text-[clamp(18px,2.2vw,26px)] italic text-tx2">
                {dossier.epithet}
              </p>
            )}
            {dossier.aliases.length > 0 && (
              <p className="mt-3 font-mono text-[11px] text-tx3">
                {t("aliasesLabel")}: {dossier.aliases.join(" · ")}
              </p>
            )}
            {dossier.lead && (
              <p className="mt-6 max-w-prose font-sans text-[17px] leading-relaxed text-tx2">
                {dossier.lead}
              </p>
            )}
            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3 font-mono text-[11px] text-tx3">
              {dossier.firstSurfaced && (
                <div><dt className="inline">{t("statFirst")}: </dt><dd className="inline text-tx2">{dossier.firstSurfaced}</dd></div>
              )}
              {dossier.origin && (
                <div><dt className="inline">{t("statOrigin")}: </dt><dd className="inline text-tx2">{dossier.origin}</dd></div>
              )}
              <div><dt className="inline">{t("statThreat")}: </dt><dd className="inline text-tx2">{threat}</dd></div>
              <div><dt className="inline">{t("statPopularity")}: </dt><dd className="inline text-tx2">{pop} {t("of100")}</dd></div>
            </dl>
          </header>

          <div className="grid gap-11 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              {dossier.sections.map((s) => (
                <section key={s.anchor} id={s.anchor} className="mb-12 scroll-mt-24">
                  <h2 className="mb-4 font-serif text-[28px] font-medium text-ink">{s.heading}</h2>
                  <div className="prose" dangerouslySetInnerHTML={{ __html: s.bodyHtml }} />
                </section>
              ))}

              {dossier.gallery.length > 0 && (
                <section id="gallery" className="mb-12 scroll-mt-24">
                  <h2 className="mb-4 font-serif text-[28px] font-medium text-ink">{t("galleryLabel")}</h2>
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {dossier.gallery.map((g, i) => (
                      <li key={i} className="rounded-[14px] border border-line bg-s1 p-3">
                        <div className="aspect-[4/3] rounded-[10px] bg-s3" />
                        {g.caption && (
                          <p className="mt-2 font-mono text-[11px] text-tx3">{g.caption}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {dossier.popularity.length > 0 && (
                <section id="popularity" className="mb-12 scroll-mt-24">
                  <h2 className="mb-4 font-serif text-[28px] font-medium text-ink">{t("popularityLabel")}</h2>
                  <div className="rounded-[16px] border border-line bg-s1 p-5">
                    <PopularityChart points={dossier.popularity} />
                  </div>
                  {dossier.popularityCaption && (
                    <p className="mt-3 font-mono text-[11px] text-tx3">{dossier.popularityCaption}</p>
                  )}
                </section>
              )}

              <RelatedEntities items={dossier.related} knownSlugs={knownSlugs} />

              <VotePanel
                entityType="DOSSIER"
                entityId={dossier.id}
                initial={{
                  likeCount: dossier.likeCount,
                  dislikeCount: dossier.dislikeCount,
                  score: dossier.score,
                }}
              />
            </div>

            <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
              <DossierFacts dossier={dossier} />
              <DossierToc dossier={dossier} />
            </aside>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
