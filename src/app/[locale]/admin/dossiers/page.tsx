import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { isAdmin } from "@/lib/admin-session";
import { listAllDossiers } from "@/lib/dossier-admin";
import { publishDossier, unpublishDossier } from "@/app/[locale]/admin/dossiers/actions";
import { formatStoryDate } from "@/lib/story-display";

export const metadata: Metadata = { robots: { index: false } };

export default async function AdminDossiersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dossierAdmin");
  if (!(await isAdmin())) {
    const currentLocale = await getLocale();
    redirect({ href: "/admin/login", locale: currentLocale });
  }
  const dossiers = await listAllDossiers();

  return (
    <main className="mx-auto max-w-shell px-6 py-12 md:px-10">
      <Link href="/admin" className="font-mono text-[11px] text-tx3 hover:text-ink">
        {t("backToAdmin")}
      </Link>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-crimson-2">{t("eyebrow")}</p>
          <h1 className="mt-2 font-serif text-[clamp(30px,4vw,48px)] font-medium text-ink">{t("heading")}</h1>
        </div>
        <Link
          href="/admin/dossiers/new"
          className="rounded-[10px] border border-crimson bg-gradient-to-b from-crimson-2 to-crimson-deep px-4 py-2 text-[12px] font-medium text-white"
        >
          {t("newButton")}
        </Link>
      </div>

      {dossiers.length === 0 ? (
        <p className="mt-12 text-tx2">{t("empty")}</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {dossiers.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-line bg-s1 px-5 py-4">
              <div className="min-w-0">
                <Link href={`/admin/dossiers/${d.id}`} className="font-serif text-[19px] text-ink hover:text-crimson-2">
                  {d.name}
                </Link>
                <p className="mt-1 font-mono text-[11px] text-tx3">
                  {d.status === "APPROVED" ? t("statusApproved") : t("statusDraft")} · {formatStoryDate(d.updatedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link href={`/admin/dossiers/${d.id}`} className="rounded-[10px] border border-line bg-s2 px-4 py-2 text-[12px] text-tx2 hover:text-ink">
                  {t("edit")}
                </Link>
                {d.status === "APPROVED" ? (
                  <form action={unpublishDossier}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="rounded-[10px] border border-line bg-s2 px-4 py-2 text-[12px] text-tx2 hover:text-ink">
                      {t("unpublish")}
                    </button>
                  </form>
                ) : (
                  <form action={publishDossier}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="rounded-[10px] border border-crimson bg-gradient-to-b from-crimson-2 to-crimson-deep px-4 py-2 text-[12px] font-medium text-white">
                      {t("publish")}
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
