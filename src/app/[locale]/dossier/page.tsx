import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DossierCard from "@/components/DossierCard";
import { getPublishedDossiers } from "@/lib/dossiers";
import { buildSafe } from "@/lib/build-safe";
import { alternates } from "@/lib/seo";

// Render against the live DB per request. As a static/ISR route this page has no
// dynamic params and gets prerendered empty on the DB-less build server, then
// serves that stale snapshot (seeds/direct DB writes never fire revalidatePath).
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dossier" });
  return {
    title: t("archiveHeading"),
    alternates: alternates(locale, "/dossier"),
  };
}

export default async function DossierIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dossier");
  const dossiers = await buildSafe(() => getPublishedDossiers(), []);

  return (
    <>
      <SiteHeader />
      <main className="pt-16">
        <div className="mx-auto max-w-shell px-6 py-12 md:px-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-crimson-2">
            {t("archiveEyebrow")}
          </p>
          <h1 className="mt-2 font-serif text-[clamp(30px,5vw,60px)] font-medium text-ink">
            {t("archiveHeading")}
          </h1>
          <p className="mt-3 max-w-prose text-tx2">{t("archiveIntro")}</p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {dossiers.map((d) => (
              <DossierCard key={d.id} dossier={d} />
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
