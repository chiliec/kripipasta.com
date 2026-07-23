import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { StoryListItem } from "@/lib/stories";
import { excerpt } from "@/lib/story-display";
import ScoreBadge from "@/components/ScoreBadge";

export default function StoryCard({ story }: { story: StoryListItem }) {
  const t = useTranslations("story");
  const primaryTag = story.tags[0];
  const year = (story.approvedAt ?? story.createdAt).getFullYear();
  return (
    <Link
      href={`/story/${story.slug}`}
      className="group flex flex-col justify-between rounded-[16px] border border-line bg-s1 p-5 transition hover:-translate-y-1 hover:border-line2 hover:bg-s2"
    >
      <div className="flex items-start justify-between gap-3">
        {primaryTag ? (
          <span className="rounded-full border border-crimson-deep bg-crimson/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-crimson-2">
            {primaryTag.name}
          </span>
        ) : (
          <span />
        )}
        <ScoreBadge score={story.score} />
      </div>

      <div className="mt-8">
        <h3 className="font-serif text-[26px] font-medium leading-[1.05] text-ink">
          {story.title}
        </h3>
        <p className="mt-3 text-[12.5px] leading-relaxed text-tx2">
          {excerpt(story.intro, story.contentHtml, 140)}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-tx3">
        <span>{year}</span>
        <span>{story.viewCount.toLocaleString()} {t("views")}</span>
      </div>
    </Link>
  );
}
