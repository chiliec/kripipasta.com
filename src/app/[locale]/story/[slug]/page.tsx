import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ReadingProgress from "@/components/ReadingProgress";
import StoryCard from "@/components/StoryCard";
import VotePanel from "@/components/VotePanel";
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
import { copy } from "@/lib/ui-copy";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getAllApprovedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) return { title: copy.notFound.heading };
  const description = excerpt(story.intro, story.contentHtml, 200);
  return {
    title: `${story.title} — Kripipasta`,
    description,
    openGraph: { title: story.title, description, type: "article" },
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) notFound();

  const related = await getRelatedStories(story, 3);
  const minutes = readingTimeMinutes(story.contentHtml);
  const posted = formatStoryDate(story.approvedAt ?? story.createdAt);

  return (
    <>
      <ReadingProgress />
      <SiteHeader />
      <main className="pt-16">
        <article className="mx-auto max-w-shell px-6 md:px-10">
          <div className="pt-10">
            <Link href="/" className="font-mono text-[11px] text-tx3 hover:text-ink">
              {copy.story.backToArchive}
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
                  {copy.story.by}{" "}
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
                {copy.story.posted} {posted} · {minutes} {copy.story.minRead}
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
                  {copy.story.related}
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
