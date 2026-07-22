import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AdminLoginForm from "@/components/AdminLoginForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("loginHeading"), robots: { index: false } };
}

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col justify-center px-6">
      <h1 className="font-serif text-[32px] font-medium text-ink">
        {t("loginHeading")}
      </h1>
      <AdminLoginForm />
    </main>
  );
}
