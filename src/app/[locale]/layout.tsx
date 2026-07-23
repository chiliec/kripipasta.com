import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Bodoni_Moda, Space_Grotesk } from "next/font/google";
import { routing } from "@/i18n/routing";

const serif = Bodoni_Moda({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Space_Grotesk({
  subsets: ["latin"], // Space Grotesk has no Cyrillic subset; body falls back via CSS stack.
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: "Nocturne — Архив интернет-хоррора",
  description:
    "Архив интернет-хоррора: истории, сущности и городские легенды сети.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Enable static rendering for everything under this layout.
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${serif.variable} ${sans.variable}`}>
      <body className="bg-bg font-sans text-ink antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
