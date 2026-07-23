import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import StoryFeed from "@/components/StoryFeed";
import ScoreBadge from "@/components/ScoreBadge";
import { getFeaturedStory, type StorySort } from "@/lib/stories";
import { excerpt, ratingKey } from "@/lib/story-display";
import { storyScore10 } from "@/lib/scoring/display";

export const revalidate = 3600;

function parseSort(v: string | undefined): StorySort {
  return v === "newest" ? "newest" : "popular";
}

function parseTake(v: string | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 9 && n <= 90 ? Math.floor(n) : 9;
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string; tag?: string; take?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("hero");
  const tStory = await getTranslations("story");

  const sp = await searchParams;
  const sort = parseSort(sp.sort);
  const take = parseTake(sp.take);
  const tagSlug = sp.tag || undefined;
  const featured = await getFeaturedStory();

  return (
    <>
      <SiteHeader />
      <main className="pt-16">
        {featured && (
          <section className="relative mx-auto flex min-h-[80vh] max-w-shell flex-col justify-end px-6 pb-16 pt-24 md:px-10">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em]">
              <span className="h-1.5 w-1.5 rounded-full bg-crimson-2" />
              <span className="text-crimson-2">{t("featured")}</span>
              {featured.tags[0] && (
                <>
                  <span className="text-tx3">·</span>
                  <span className="text-tx3">{featured.tags[0].name}</span>
                </>
              )}
            </div>
            <h1 className="mt-6 max-w-[16ch] font-serif text-[clamp(48px,9vw,120px)] font-medium leading-[0.92] text-ink">
              {featured.title}
            </h1>
            <p className="mt-6 max-w-[40ch] font-serif text-[clamp(18px,2.2vw,26px)] italic text-tx2">
              {excerpt(featured.intro, featured.contentHtml, 200)}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-8">
              <Link
                href={`/story/${featured.slug}`}
                className="rounded-[11px] border border-crimson bg-gradient-to-b from-crimson-2 to-crimson-deep px-5 py-3 text-[14px] font-medium text-white"
              >
                {t("read")}
              </Link>
              <div className="flex flex-col">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-tx3">
                  {tStory(ratingKey(storyScore10(featured.score)))}
                </span>
                <ScoreBadge score={featured.score} size="lg" />
              </div>
            </div>
          </section>
        )}

        <StoryFeed sort={sort} tagSlug={tagSlug} take={take} />
      </main>
      <SiteFooter />
    </>
  );
}
