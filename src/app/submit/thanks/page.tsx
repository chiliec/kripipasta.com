import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { copy } from "@/lib/ui-copy";

export const metadata: Metadata = {
  title: copy.submitThanks.heading,
  robots: { index: false },
};

export default function SubmitThanksPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[70vh] max-w-shell flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-[clamp(32px,6vw,64px)] font-medium text-ink">
          {copy.submitThanks.heading}
        </h1>
        <p className="mt-4 max-w-[52ch] text-tx2">{copy.submitThanks.body}</p>
        <Link
          href="/"
          className="mt-8 rounded-[11px] border border-line bg-s1 px-5 py-3 text-[13px] text-tx2 hover:text-ink"
        >
          {copy.submitThanks.back}
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
