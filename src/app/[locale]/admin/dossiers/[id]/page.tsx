import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { isAdmin } from "@/lib/admin-session";
import DossierForm from "@/components/DossierForm";
import { getDossierForEdit } from "@/lib/dossier-admin";
import { saveDossier } from "@/app/[locale]/admin/dossiers/actions";

export const metadata: Metadata = { robots: { index: false } };

export default async function EditDossierPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dossierAdmin");
  if (!(await isAdmin())) {
    const currentLocale = await getLocale();
    redirect({ href: "/admin/login", locale: currentLocale });
  }
  const dossier = await getDossierForEdit(id);
  if (!dossier) notFound();
  return (
    <main className="mx-auto max-w-shell px-6 py-12 md:px-10">
      <Link href="/admin/dossiers" className="font-mono text-[11px] text-tx3 hover:text-ink">
        {t("backToList")}
      </Link>
      <h1 className="mb-8 mt-4 font-serif text-[clamp(30px,4vw,48px)] font-medium text-ink">
        {dossier.name}
      </h1>
      <DossierForm action={saveDossier} dossier={dossier} />
    </main>
  );
}
