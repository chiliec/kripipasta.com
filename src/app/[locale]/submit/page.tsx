import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SubmitForm from "@/components/SubmitForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "submit" });
  return { title: `${t("heading")} — Kripipasta` };
}

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("submit");

  return (
    <>
      <SiteHeader />
      <main className="pt-16">
        <section className="mx-auto max-w-prose px-6 py-16 md:px-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-crimson-2">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 font-serif text-[clamp(34px,5vw,60px)] font-medium text-ink">
            {t("heading")}
          </h1>
          <p className="mt-4 text-tx2">{t("intro")}</p>
          <SubmitForm />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
