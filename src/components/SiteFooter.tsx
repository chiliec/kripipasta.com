import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function SiteFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="mx-auto max-w-shell px-6 py-16 md:px-10">
      <div className="grid gap-10 border-t border-line pt-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="block h-[10px] w-[10px] rotate-45 bg-crimson" />
            <span className="font-serif text-[20px] text-ink">
              {t("aboutHeading")}
            </span>
          </div>
          <p className="max-w-[38ch] text-[13.5px] leading-relaxed text-tx2">
            {t("about")}
          </p>
        </div>

        <div>
          <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-tx3">
            {t("exploreHeading")}
          </h3>
          <ul className="space-y-2 text-[13.5px] text-tx2">
            <li><Link href="/#feed" className="hover:text-ink">{t("explore.all")}</Link></li>
            <li><Link href="/#feed" className="hover:text-ink">{t("explore.categories")}</Link></li>
            <li><Link href="/#feed" className="hover:text-ink">{t("explore.trending")}</Link></li>
            <li><Link href="/#feed" className="hover:text-ink">{t("explore.index")}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-tx3">
            {t("communityHeading")}
          </h3>
          <ul className="space-y-2 text-[13.5px] text-tx2">
            <li><Link href="/#feed" className="hover:text-ink">{t("community.contribute")}</Link></li>
            <li><Link href="/#feed" className="hover:text-ink">{t("community.guidelines")}</Link></li>
            <li><Link href="/#feed" className="hover:text-ink">{t("community.recent")}</Link></li>
          </ul>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap justify-between gap-3 border-t border-line pt-6 font-mono text-[9.5px] uppercase tracking-[0.15em] text-tx3">
        <span>{t("estLeft")}</span>
        <span>{t("estRight")}</span>
      </div>
    </footer>
  );
}
