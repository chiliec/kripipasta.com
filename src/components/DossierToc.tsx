import { getTranslations } from "next-intl/server";
import type { DossierDetail } from "@/lib/dossiers";
import { buildDossierToc } from "@/lib/dossier-display";

export default async function DossierToc({ dossier }: { dossier: DossierDetail }) {
  const t = await getTranslations("dossier");
  const toc = buildDossierToc(dossier);
  const headingByAnchor = new Map(dossier.sections.map((s) => [s.anchor, s.heading]));
  return (
    <nav className="rounded-[16px] border border-line bg-s1 p-6">
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-tx3">
        {t("contents")}
      </p>
      <ol className="flex flex-col gap-2">
        {toc.map((b) => (
          <li key={b.anchor}>
            <a
              href={`#${b.anchor}`}
              className="font-mono text-[12px] text-tx2 hover:text-crimson-2"
            >
              {b.labelKey ? t(b.labelKey) : headingByAnchor.get(b.anchor) ?? b.anchor}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
