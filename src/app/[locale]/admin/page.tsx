import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { isAdmin } from "@/lib/admin-session";
import {
  getPendingStories,
  getPendingCount,
  type PendingSource,
} from "@/lib/moderation";
import { approveStory, rejectStory, logout } from "@/app/[locale]/admin/actions";
import { formatStoryDate } from "@/lib/story-display";

export const metadata: Metadata = { robots: { index: false } };

const PAGE = 20;

export default async function AdminQueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ source?: string; take?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  if (!(await isAdmin())) {
    const currentLocale = await getLocale();
    redirect({ href: "/admin/login", locale: currentLocale });
  }

  const sp = await searchParams;
  const source: PendingSource = sp.source === "new" ? "new" : "all";
  const take = Math.max(PAGE, Number(sp.take) || PAGE);

  const [{ items, total }, count] = await Promise.all([
    getPendingStories({ source, take }),
    getPendingCount(source),
  ]);

  const filterHref = (s: PendingSource) => `/admin${s === "new" ? "?source=new" : ""}`;
  const moreHref = `/admin?${new URLSearchParams({
    ...(source === "new" ? { source: "new" } : {}),
    take: String(take + PAGE),
  })}`;

  return (
    <main className="mx-auto max-w-shell px-6 py-12 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-crimson-2">
            {t("queueEyebrow")}
          </p>
          <h1 className="mt-2 font-serif text-[clamp(30px,4vw,48px)] font-medium text-ink">
            {t("queueHeading")}
          </h1>
          <p className="mt-2 font-mono text-[11px] text-tx3">
            {t("pendingTemplate", { count })}
          </p>
        </div>
        <form action={logout}>
          <button className="rounded-[10px] border border-line bg-s1 px-4 py-2 text-[12px] text-tx2 hover:text-ink">
            {t("logout")}
          </button>
        </form>
      </div>

      <div className="mt-6 flex gap-2">
        <Filter href={filterHref("all")} active={source === "all"} label={t("filterAll")} />
        <Filter href={filterHref("new")} active={source === "new"} label={t("filterNew")} />
      </div>

      {items.length === 0 ? (
        <p className="mt-12 text-tx2">{t("empty")}</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {items.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-line bg-s1 px-5 py-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/story/${s.id}`}
                  className="font-serif text-[19px] text-ink hover:text-crimson-2"
                >
                  {s.title}
                </Link>
                <p className="mt-1 font-mono text-[11px] text-tx3">
                  {t("submittedOn")} {formatStoryDate(s.createdAt)}
                  {s.authorName && ` · ${t("submittedBy")}: ${s.authorName}`}
                  {s.legacyId !== null && " · legacy"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/admin/story/${s.id}`}
                  className="rounded-[10px] border border-line bg-s2 px-4 py-2 text-[12px] text-tx2 hover:text-ink"
                >
                  {t("review")}
                </Link>
                <form action={approveStory}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="rounded-[10px] border border-crimson bg-gradient-to-b from-crimson-2 to-crimson-deep px-4 py-2 text-[12px] font-medium text-white">
                    {t("approve")}
                  </button>
                </form>
                <form action={rejectStory}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="rounded-[10px] border border-line bg-s2 px-4 py-2 text-[12px] text-tx2 hover:text-ink">
                    {t("reject")}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {items.length < total && (
        <div className="mt-8 flex justify-center">
          <Link
            href={moreHref}
            className="rounded-[12px] border border-line bg-s1 px-6 py-3 text-[13px] text-tx2 hover:text-ink"
          >
            {t("loadMore")}
          </Link>
        </div>
      )}
    </main>
  );
}

function Filter({
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
