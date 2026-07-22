import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { isAdmin } from "@/lib/admin-session";
import { getStoryForModeration } from "@/lib/moderation";
import { approveStory, rejectStory } from "@/app/[locale]/admin/actions";
import { formatStoryDate } from "@/lib/story-display";

export const metadata: Metadata = { robots: { index: false } };

export default async function AdminStoryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  if (!(await isAdmin())) {
    const currentLocale = await getLocale();
    redirect({ href: "/admin/login", locale: currentLocale });
  }
  const story = await getStoryForModeration(id);
  if (!story) notFound();

  return (
    <main className="mx-auto max-w-prose px-6 py-12 md:px-10">
      <Link href="/admin" className="font-mono text-[11px] text-tx3 hover:text-ink">
        {t("backToQueue")}
      </Link>

      <h1 className="mt-6 font-serif text-[clamp(30px,5vw,52px)] font-medium text-ink">
        {story.title}
      </h1>
      <p className="mt-3 font-mono text-[11px] text-tx3">
        {t("submittedOn")} {formatStoryDate(story.createdAt)}
        {story.authorName && ` · ${t("submittedBy")}: ${story.authorName}`}
        {story.authorEmail && ` · ${story.authorEmail}`}
      </p>
      {story.tags.length > 0 && (
        <p className="mt-2 font-mono text-[11px] text-crimson-2">
          {story.tags.map((tag) => tag.name).join(" · ")}
        </p>
      )}

      {story.intro && (
        <p className="mt-6 font-serif text-[20px] italic text-tx2">{story.intro}</p>
      )}

      <div
        className="prose mt-8"
        dangerouslySetInnerHTML={{ __html: story.contentHtml }}
      />

      <div className="mt-10 flex items-center gap-3 border-t border-line pt-8">
        <form action={approveStory}>
          <input type="hidden" name="id" value={story.id} />
          <button className="rounded-[11px] border border-crimson bg-gradient-to-b from-crimson-2 to-crimson-deep px-6 py-3 text-[14px] font-medium text-white">
            {t("approve")}
          </button>
        </form>
        <form action={rejectStory}>
          <input type="hidden" name="id" value={story.id} />
          <button className="rounded-[11px] border border-line bg-s1 px-6 py-3 text-[14px] text-tx2 hover:text-ink">
            {t("reject")}
          </button>
        </form>
      </div>
    </main>
  );
}
