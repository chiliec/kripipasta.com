import { getTranslations } from "next-intl/server";
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Kripipasta";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  return renderOgImage({
    eyebrow: t("tagline"),
    title: locale === "ru" ? "Архив интернет-хоррора" : "Internet Horror Archive",
  });
}
