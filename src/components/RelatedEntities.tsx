import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { DossierRelatedItem } from "@/lib/dossiers";

export default async function RelatedEntities({
  items,
  knownSlugs,
}: {
  items: DossierRelatedItem[];
  knownSlugs: string[];
}) {
  if (items.length === 0) return null;
  const t = await getTranslations("dossier");
  return (
    <section id="related" className="mt-14 scroll-mt-24">
      <h2 className="font-serif text-[28px] font-medium text-ink">{t("relatedLabel")}</h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.map((r) => {
          const known = knownSlugs.includes(r.targetSlug);
          const inner = (
            <>
              <span className="font-serif text-[18px] text-ink">{r.name}</span>
              <span className="mt-1 block font-mono text-[11px] text-tx3">{r.rel}</span>
              <span className="mt-2 block font-mono text-[10px] text-crimson-2">
                {t("relatedThreat")} {r.threat}
              </span>
            </>
          );
          return (
            <li key={r.targetSlug} className="rounded-[14px] border border-line bg-s1 p-4">
              {known ? (
                <Link href={`/dossier/${r.targetSlug}`} className="block hover:opacity-80">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
