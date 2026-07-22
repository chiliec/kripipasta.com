import Link from "next/link";
import {
  getApprovedStories,
  getFilterTags,
  type StorySort,
} from "@/lib/stories";
import StoryCard from "@/components/StoryCard";
import { copy } from "@/lib/ui-copy";

const PAGE = 9;

function href(params: { sort: StorySort; tag?: string; take?: number }) {
  const sp = new URLSearchParams();
  if (params.sort !== "popular") sp.set("sort", params.sort);
  if (params.tag) sp.set("tag", params.tag);
  if (params.take && params.take !== PAGE) sp.set("take", String(params.take));
  const qs = sp.toString();
  return `/${qs ? `?${qs}` : ""}#feed`;
}

export default async function StoryFeed({
  sort,
  tagSlug,
  take,
}: {
  sort: StorySort;
  tagSlug?: string;
  take: number;
}) {
  const [{ items, total }, tags] = await Promise.all([
    getApprovedStories({ sort, tagSlug, take }),
    getFilterTags(7),
  ]);

  const sorts: { key: StorySort; label: string }[] = [
    { key: "popular", label: copy.feed.sortPopular },
    { key: "newest", label: copy.feed.sortNewest },
  ];

  return (
    <section id="feed" className="mx-auto max-w-shell scroll-mt-24 px-6 py-16 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-crimson-2">
            {copy.feed.eyebrow}
          </p>
          <h2 className="mt-2 font-serif text-[clamp(34px,4vw,52px)] font-medium text-ink">
            {copy.feed.heading}
          </h2>
        </div>
        <p className="font-mono text-[11px] text-tx3">
          {copy.feed.countTemplate
            .replace("{shown}", String(items.length))
            .replace("{total}", String(total))}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Chip href={href({ sort })} active={!tagSlug} label={copy.feed.allTag} />
          {tags.map((t) => (
            <Chip
              key={t.slug}
              href={href({ sort, tag: t.slug })}
              active={tagSlug === t.slug}
              label={t.name}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-tx3">
            {copy.feed.sortLabel}
          </span>
          <div className="flex rounded-[10px] border border-line bg-s1 text-[12px]">
            {sorts.map((s) => (
              <Link
                key={s.key}
                href={href({ sort: s.key, tag: tagSlug })}
                className={
                  s.key === sort
                    ? "rounded-[8px] bg-s3 px-3 py-1.5 text-ink"
                    : "px-3 py-1.5 text-tx3 hover:text-ink"
                }
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-12 text-tx2">{copy.feed.empty}</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}

      {items.length < total && (
        <div className="mt-10 flex justify-center">
          <Link
            href={href({ sort, tag: tagSlug, take: take + PAGE })}
            className="rounded-[12px] border border-line bg-s1 px-6 py-3 text-[13px] text-tx2 hover:border-line2 hover:text-ink"
          >
            {copy.feed.loadMore}
          </Link>
        </div>
      )}
    </section>
  );
}

function Chip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full border border-crimson-deep bg-crimson/10 px-3.5 py-1.5 text-[12px] text-crimson-2"
          : "rounded-full border border-line bg-s1 px-3.5 py-1.5 text-[12px] text-tx2 hover:text-ink"
      }
    >
      {label}
    </Link>
  );
}
