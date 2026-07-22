import Link from "next/link";
import { copy } from "@/lib/ui-copy";

export default function SiteFooter() {
  return (
    <footer className="mx-auto max-w-shell px-6 py-16 md:px-10">
      <div className="grid gap-10 border-t border-line pt-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="block h-[10px] w-[10px] rotate-45 bg-crimson" />
            <span className="font-serif text-[20px] text-ink">
              {copy.footer.aboutHeading}
            </span>
          </div>
          <p className="max-w-[38ch] text-[13.5px] leading-relaxed text-tx2">
            {copy.footer.about}
          </p>
        </div>

        <div>
          <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-tx3">
            {copy.footer.exploreHeading}
          </h3>
          <ul className="space-y-2 text-[13.5px] text-tx2">
            <li><Link href="/#feed" className="hover:text-ink">{copy.footer.explore.all}</Link></li>
            <li><Link href="/#feed" className="hover:text-ink">{copy.footer.explore.categories}</Link></li>
            <li><Link href="/#feed" className="hover:text-ink">{copy.footer.explore.trending}</Link></li>
            <li><Link href="/#feed" className="hover:text-ink">{copy.footer.explore.index}</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-tx3">
            {copy.footer.communityHeading}
          </h3>
          <ul className="space-y-2 text-[13.5px] text-tx2">
            <li><Link href="/#feed" className="hover:text-ink">{copy.footer.community.contribute}</Link></li>
            <li><Link href="/#feed" className="hover:text-ink">{copy.footer.community.guidelines}</Link></li>
            <li><Link href="/#feed" className="hover:text-ink">{copy.footer.community.recent}</Link></li>
          </ul>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap justify-between gap-3 border-t border-line pt-6 font-mono text-[9.5px] uppercase tracking-[0.15em] text-tx3">
        <span>{copy.footer.estLeft}</span>
        <span>{copy.footer.estRight}</span>
      </div>
    </footer>
  );
}
