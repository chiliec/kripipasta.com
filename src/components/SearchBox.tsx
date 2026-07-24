"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export default function SearchBox({ initialQuery = "" }: { initialQuery?: string }) {
  const t = useTranslations("header");
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        if (!q) return;
        router.push(`/search?q=${encodeURIComponent(q)}`);
      }}
      role="search"
      className="flex w-full items-center gap-2 rounded-[11px] border border-line bg-s1 px-3 py-[9px] text-tx3 focus-within:border-line2"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="w-full min-w-0 bg-transparent text-[12px] text-ink placeholder:text-tx3 focus:outline-none"
      />
    </form>
  );
}
