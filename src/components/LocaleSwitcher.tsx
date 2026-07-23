"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default function LocaleSwitcher() {
  const active = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("localeSwitcher");

  return (
    <div
      className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em]"
      aria-label={t("label")}
    >
      {routing.locales.map((loc, i) => (
        <span key={loc} className="flex items-center gap-1">
          {i > 0 && <span className="text-line2">·</span>}
          <button
            type="button"
            onClick={() => router.replace(pathname, { locale: loc })}
            aria-current={loc === active ? "true" : undefined}
            className={
              loc === active
                ? "text-ink"
                : "text-tx3 hover:text-ink transition-colors"
            }
          >
            {t(loc as "ru" | "en")}
          </button>
        </span>
      ))}
    </div>
  );
}
