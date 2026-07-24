import { getTranslations } from "next-intl/server";
import { getStoryBySlug } from "@/lib/stories";
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
  const story = await buildSafe(() => getStoryBySlug(slug), null);
  const t = await getTranslations({ locale, namespace: "site" });
  return renderOgImage({
    eyebrow: story?.tags[0]?.name ?? t("tagline"),
    title: story?.title ?? "Kripipasta",
    meta: story?.authorName || undefined,
  });
}
