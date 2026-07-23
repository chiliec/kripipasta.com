import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "submitThanks" });
  return { title: t("heading"), robots: { index: false } };
}

export default async function SubmitThanksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("submitThanks");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[70vh] max-w-shell flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-[clamp(32px,6vw,64px)] font-medium text-ink">
          {t("heading")}
        </h1>
        <p className="mt-4 max-w-[52ch] text-tx2">{t("body")}</p>
        <Link
          href="/"
          className="mt-8 rounded-[11px] border border-line bg-s1 px-5 py-3 text-[13px] text-tx2 hover:text-ink"
        >
          {t("back")}
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
