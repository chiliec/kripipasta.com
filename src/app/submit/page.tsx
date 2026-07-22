import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SubmitForm from "@/components/SubmitForm";
import { copy } from "@/lib/ui-copy";

export const metadata: Metadata = {
  title: `${copy.submit.heading} — Kripipasta`,
};

export default function SubmitPage() {
  return (
    <>
      <SiteHeader />
      <main className="pt-16">
        <section className="mx-auto max-w-prose px-6 py-16 md:px-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-crimson-2">
            {copy.submit.eyebrow}
          </p>
          <h1 className="mt-2 font-serif text-[clamp(34px,5vw,60px)] font-medium text-ink">
            {copy.submit.heading}
          </h1>
          <p className="mt-4 text-tx2">{copy.submit.intro}</p>
          <SubmitForm />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
