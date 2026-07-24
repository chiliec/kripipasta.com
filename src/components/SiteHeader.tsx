import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import SearchBox from "@/components/SearchBox";

export default function SiteHeader() {
  const tSite = useTranslations("site");
  const tNav = useTranslations("nav");
  const tHeader = useTranslations("header");

  return (
    <header className="fixed inset-x-0 top-0 z-[110] border-b border-line bg-bg/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-shell items-center gap-6 px-6 py-4 md:px-10">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <span className="block h-[11px] w-[11px] rotate-45 bg-crimson shadow-[0_0_12px_var(--tw-shadow-color)] shadow-crimson/50" />
          <span className="leading-tight">
            <span className="block font-serif text-[19px] font-semibold tracking-[0.02em] text-ink">
              {tSite("name")}
            </span>
            <span className="block font-mono text-[8px] uppercase tracking-[0.28em] text-tx3">
              {tSite("tagline")}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 text-[13px] text-tx2 lg:flex">
          <Link href="/" className="hover:text-ink">{tNav("browse")}</Link>
          <Link href="/#feed" className="hover:text-ink">{tNav("categories")}</Link>
          <Link href="/#feed" className="hover:text-ink">{tNav("trending")}</Link>
          <Link href="/#feed" className="hover:text-ink">{tNav("index")}</Link>
          <Link href="/dossier" className="hover:text-ink">{tNav("dossiers")}</Link>
        </nav>

        <div className="ml-auto hidden min-w-0 flex-1 items-center md:flex md:max-w-[420px]">
          <SearchBox />
        </div>

        <div className="ml-auto flex items-center gap-3 md:ml-0">
          <LocaleSwitcher />
          <Link
            href="/submit"
            className="rounded-[11px] border border-crimson bg-gradient-to-b from-crimson-2 to-crimson-deep px-3.5 py-2 text-[13px] font-medium text-white"
          >
            {tHeader("submit")}
          </Link>
        </div>
      </div>
    </header>
  );
}
