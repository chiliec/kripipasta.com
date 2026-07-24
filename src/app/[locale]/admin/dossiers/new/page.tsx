import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { isAdmin } from "@/lib/admin-session";
import DossierForm from "@/components/DossierForm";
import { saveNewDossier } from "@/app/[locale]/admin/dossiers/actions";

export const metadata: Metadata = { robots: { index: false } };

export default async function NewDossierPage({
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
  return (
    <main className="mx-auto max-w-shell px-6 py-12 md:px-10">
      <Link href="/admin/dossiers" className="font-mono text-[11px] text-tx3 hover:text-ink">
        {t("backToList")}
      </Link>
      <h1 className="mb-8 mt-4 font-serif text-[clamp(30px,4vw,48px)] font-medium text-ink">
        {t("newButton")}
      </h1>
      <DossierForm action={saveNewDossier} />
    </main>
  );
}
