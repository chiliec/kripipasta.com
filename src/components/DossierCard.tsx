import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { DossierListItem } from "@/lib/dossiers";
import { threatLevelKey, dossierScore100 } from "@/lib/dossier-display";

export default async function DossierCard({ dossier }: { dossier: DossierListItem }) {
  const t = await getTranslations("dossier");
  return (
    <Link
      href={`/dossier/${dossier.slug}`}
      className="block rounded-[16px] border border-line bg-s1 p-6 transition-colors hover:border-line2"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-crimson-2">
        {dossier.category}
      </p>
      <h3 className="mt-3 font-serif text-[26px] font-medium text-ink">{dossier.name}</h3>
      {dossier.epithet && (
        <p className="mt-1 font-serif text-[15px] italic text-tx2">{dossier.epithet}</p>
      )}
      <div className="mt-4 flex items-center justify-between font-mono text-[11px] text-tx3">
        <span>{t(threatLevelKey(dossier.threatLevel))}</span>
        <span className="text-crimson-2">
          {dossierScore100(dossier.score)} {t("of100")}
        </span>
      </div>
    </Link>
  );
}
