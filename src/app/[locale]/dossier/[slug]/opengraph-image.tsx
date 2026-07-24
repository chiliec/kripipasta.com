import { getTranslations } from "next-intl/server";
import { getPublishedDossierBySlug } from "@/lib/dossiers";
import { buildSafe } from "@/lib/build-safe";
import { renderOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Kripipasta";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const dossier = await buildSafe(() => getPublishedDossierBySlug(slug), null);
  const t = await getTranslations({ locale, namespace: "dossier" });
  return renderOgImage({
    eyebrow: t("archiveHeading"),
    title: dossier?.name ?? "Kripipasta",
  });
}
