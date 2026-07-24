"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { DossierDetail } from "@/lib/dossiers";

const THREAT_LEVELS = ["LOW", "MODERATE", "HIGH", "SEVERE", "EXTREME"] as const;

const inputCls =
  "w-full rounded-[10px] border border-line bg-s2 px-3 py-2 text-[14px] text-ink";
const labelCls = "mb-1 block font-mono text-[11px] uppercase tracking-[0.15em] text-tx3";

function Field({ name, label, value = "" }: { name: string; label: string; value?: string }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input name={name} defaultValue={value} className={inputCls} />
    </div>
  );
}

export default function DossierForm({
  action,
  dossier,
}: {
  action: (formData: FormData) => void;
  dossier?: DossierDetail;
}) {
  const t = useTranslations("dossierAdmin");
  const [sections, setSections] = useState(
    dossier?.sections.length
      ? dossier.sections.map((s) => ({ heading: s.heading, body: s.bodyHtml }))
      : [{ heading: "", body: "" }],
  );
  const relatedLines = (dossier?.related ?? [])
    .map((r) => `${r.targetSlug}|${r.name}|${r.rel}|${r.threat}`)
    .join("\n");

  return (
    <form action={action} className="flex flex-col gap-5">
      {dossier && <input type="hidden" name="id" value={dossier.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label={t("fName")} value={dossier?.name} />
        <Field name="slug" label={t("fSlug")} value={dossier?.slug} />
        <Field name="epithet" label={t("fEpithet")} value={dossier?.epithet} />
        <Field name="category" label={t("fCategory")} value={dossier?.category} />
        <Field name="canonStatus" label={t("fCanon")} value={dossier?.canonStatus} />
        <Field name="aliases" label={t("fAliases")} value={dossier?.aliases.join(", ")} />
        <div>
          <label className={labelCls}>{t("fThreatLevel")}</label>
          <select name="threatLevel" defaultValue={dossier?.threatLevel ?? "MODERATE"} className={inputCls}>
            {THREAT_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
        </div>
        <Field name="threatScore" label={t("fThreatScore")} value={dossier ? String(dossier.threatScore) : "0"} />
        <Field name="dangerScore" label={t("fDangerScore")} value={dossier ? String(dossier.dangerScore) : "0"} />
        <Field name="firstSurfaced" label={t("fFirstSurfaced")} value={dossier?.firstSurfaced ? String(dossier.firstSurfaced) : ""} />
        <Field name="origin" label={t("fOrigin")} value={dossier?.origin} />
        <Field name="species" label={t("fSpecies")} value={dossier?.species} />
        <Field name="statusText" label={t("fStatus")} value={dossier?.statusText} />
        <Field name="creator" label={t("fCreator")} value={dossier?.creator} />
        <Field name="height" label={t("fHeight")} value={dossier?.height} />
        <Field name="habitat" label={t("fHabitat")} value={dossier?.habitat} />
      </div>

      <div>
        <label className={labelCls}>{t("fLead")}</label>
        <textarea name="lead" defaultValue={dossier?.lead} rows={3} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>{t("fPopCaption")}</label>
        <textarea name="popularityCaption" defaultValue={dossier?.popularityCaption} rows={2} className={inputCls} />
      </div>

      <fieldset className="rounded-[12px] border border-line p-4">
        <legend className="px-2 font-mono text-[11px] uppercase tracking-[0.15em] text-crimson-2">
          {t("sections")}
        </legend>
        <div className="flex flex-col gap-4">
          {sections.map((s, i) => (
            <div key={i} className="rounded-[10px] border border-line bg-s1 p-3">
              <input
                name="sectionHeading"
                defaultValue={s.heading}
                placeholder={t("sectionHeading")}
                className={`${inputCls} mb-2`}
              />
              <textarea
                name="sectionBody"
                defaultValue={s.body}
                placeholder={t("sectionBody")}
                rows={5}
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => setSections((prev) => prev.filter((_, j) => j !== i))}
                className="mt-2 text-[11px] text-tx3 hover:text-crimson-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSections((prev) => [...prev, { heading: "", body: "" }])}
          className="mt-3 rounded-[9px] border border-line bg-s2 px-3 py-1.5 text-[12px] text-tx2 hover:text-ink"
        >
          +
        </button>
      </fieldset>

      <div>
        <label className={labelCls}>{t("gallery")}</label>
        <textarea
          name="galleryCaption"
          defaultValue={(dossier?.gallery ?? []).map((g) => g.caption).join("\n")}
          rows={3}
          className={inputCls}
          placeholder="one caption per line"
        />
        <p className="mt-1 font-mono text-[10px] text-tx3">one caption per line — each line = one gallery slot</p>
      </div>

      <div>
        <label className={labelCls}>{t("related")}</label>
        <textarea name="relatedLines" defaultValue={relatedLines} rows={4} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>{t("popularity")}</label>
        <div className="flex flex-col gap-2">
          {(dossier?.popularity.length ? dossier.popularity : [{ year: "", value: "" }]).map((p, i) => (
            <div key={i} className="flex gap-2">
              <input name="popYear" defaultValue={String(p.year)} placeholder="year" className={inputCls} />
              <input name="popValue" defaultValue={String(p.value)} placeholder="0–100" className={inputCls} />
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="self-start rounded-[11px] border border-crimson bg-gradient-to-b from-crimson-2 to-crimson-deep px-6 py-3 text-[14px] font-medium text-white"
      >
        {t("save")}
      </button>
    </form>
  );
}
