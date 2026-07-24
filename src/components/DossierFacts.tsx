import { getTranslations } from "next-intl/server";
import type { DossierDetail } from "@/lib/dossiers";
import { threatLevelKey, dossierScore100 } from "@/lib/dossier-display";

function Bar({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-baseline justify-between font-mono text-[11px] text-tx3">
        <span>{label}</span>
        <span className="text-tx2">{suffix ?? String(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-s3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-crimson-deep to-crimson"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 border-t border-line py-2 text-[12.5px]">
      <span className="text-tx3">{label}</span>
      <span className="text-right text-tx2">{value}</span>
    </div>
  );
}

export default async function DossierFacts({ dossier }: { dossier: DossierDetail }) {
  const t = await getTranslations("dossier");
  const threat = t(threatLevelKey(dossier.threatLevel));
  const pop = dossierScore100(dossier.score);
  return (
    <div className="rounded-[16px] border border-line bg-s1 p-6">
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-tx3">
        {t("factsLabel")}
      </p>
      <Bar label={t("fThreat")} value={dossier.threatScore} suffix={`${dossier.threatScore} · ${threat}`} />
      <Bar label={t("fDanger")} value={dossier.dangerScore} />
      <Bar label={t("fPopularity")} value={pop} />
      <div className="mt-4">
        <Row label={t("gSpecies")} value={dossier.species} />
        <Row label={t("gStatus")} value={dossier.statusText} />
        <Row label={t("gCreator")} value={dossier.creator} />
        <Row label={t("gYear")} value={dossier.firstSurfaced ? String(dossier.firstSurfaced) : ""} />
        <Row label={t("gHeight")} value={dossier.height} />
        <Row label={t("gCanon")} value={dossier.canonStatus} />
        <Row label={t("gHabitat")} value={dossier.habitat} />
      </div>
    </div>
  );
}
