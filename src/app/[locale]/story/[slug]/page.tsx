import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ReadingProgress from "@/components/ReadingProgress";
import StoryCard from "@/components/StoryCard";
import VotePanel from "@/components/VotePanel";
import JsonLd from "@/components/JsonLd";
import { SITE_NAME, SITE_URL, alternates } from "@/lib/seo";
import {
  getStoryBySlug,
  getRelatedStories,
  getAllApprovedSlugs,
} from "@/lib/stories";
import {
  formatStoryDate,
  readingTimeMinutes,
  excerpt,
} from "@/lib/story-display";
import { buildSafe } from "@/lib/build-safe";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await buildSafe<string[]>(() => getAllApprovedSlugs(), []);
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
  const story = await getStoryBySlug(slug);
  if (!story) {
    const t = await getTranslations({ locale, namespace: "notFound" });
    return { title: t("heading") };
  }
  const description = excerpt(story.intro, story.contentHtml, 200);
  const published = (story.approvedAt ?? story.createdAt).toISOString();
  return {
    title: story.title,
    description,
    alternates: alternates(locale, `/story/${slug}`),
    openGraph: {
      title: story.title,
      description,
      type: "article",
      url: `/${locale}/story/${slug}`,
      publishedTime: published,
      authors: story.authorName ? [story.authorName] : undefined,
      tags: story.tags.map((tag) => tag.name),
    },
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("story");

  const story = await getStoryBySlug(slug);
  if (!story) notFound();

  const related = await getRelatedStories(story, 3);
  const minutes = readingTimeMinutes(story.contentHtml);
  const posted = formatStoryDate(story.approvedAt ?? story.createdAt, locale);

  const canonical = `${SITE_URL}/${locale}/story/${slug}`;
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: story.title,
    description: excerpt(story.intro, story.contentHtml, 200),
    inLanguage: locale,
    datePublished: (story.approvedAt ?? story.createdAt).toISOString(),
    dateModified: (story.approvedAt ?? story.createdAt).toISOString(),
    author: {
      "@type": story.authorName ? "Person" : "Organization",
      name: story.authorName || SITE_NAME,
      ...(story.authorLink ? { url: story.authorLink } : {}),
    },
    publisher: { "@type": "Organization", name: SITE_NAME },
    keywords: story.tags.map((tag) => tag.name).join(", "),
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
            <Link href="/" className="font-mono text-[11px] text-tx3 hover:text-ink">
              {t("backToArchive")}
            </Link>
          </div>

          <header className="max-w-prose py-10">
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em]">
              {story.tags[0] && (
                <span className="text-crimson-2">{story.tags[0].name}</span>
              )}
            </div>
            <h1 className="mt-5 font-serif text-[clamp(40px,7vw,96px)] font-medium leading-[0.95] text-ink">
              {story.title}
            </h1>
            {story.intro && (
              <p className="mt-6 font-serif text-[clamp(18px,2.2vw,26px)] italic text-tx2">
                {story.intro}
              </p>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-tx3">
              {story.authorName && (
                <span>
                  {t("by")}{" "}
                  {story.authorLink ? (
                    <a href={story.authorLink} className="text-crimson-2">
                      {story.authorName}
                    </a>
                  ) : (
                    <span className="text-crimson-2">{story.authorName}</span>
                  )}
                </span>
              )}
              <span>
                {t("posted")} {posted} · {minutes} {t("minRead")}
              </span>
            </div>
          </header>

          <div className="grid gap-11 lg:grid-cols-[minmax(0,1fr)_288px]">
            <div>
              <div
                className="prose"
                dangerouslySetInnerHTML={{ __html: story.contentHtml }}
              />

              <VotePanel
                entityType="STORY"
                entityId={story.id}
                initial={{
                  likeCount: story.likeCount,
                  dislikeCount: story.dislikeCount,
                  score: story.score,
                }}
              />
            </div>

            {related.length > 0 && (
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-tx3">
                  {t("related")}
                </p>
                <div className="flex flex-col gap-4">
                  {related.map((r) => (
                    <StoryCard key={r.id} story={r} />
                  ))}
                </div>
              </aside>
            )}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
