"use client";

import { useActionState } from "react";
import { submitStory, type SubmitState } from "@/app/[locale]/submit/actions";
import { copy } from "@/lib/ui-copy";

const initial: SubmitState = {};

const fieldClass =
  "mt-2 w-full rounded-[11px] border border-line bg-s1 px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-line2";
const labelClass =
  "font-mono text-[11px] uppercase tracking-[0.18em] text-tx3";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[12px] text-crimson-2">{message}</p>;
}

export default function SubmitForm() {
  const [state, formAction, pending] = useActionState(submitStory, initial);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="mt-10 flex flex-col gap-6">
      {errors.form && (
        <p className="rounded-[11px] border border-crimson-deep bg-crimson/10 px-4 py-3 text-[13px] text-crimson-2">
          {copy.submit.errorGeneric}
        </p>
      )}

      {/* Honeypot: hidden from users, tempting to bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0"
      />

      <label className="block">
        <span className={labelClass}>{copy.submit.titleLabel}</span>
        <input name="title" type="text" required className={fieldClass} />
        <FieldError message={errors.title} />
      </label>

      <label className="block">
        <span className={labelClass}>{copy.submit.introLabel}</span>
        <input name="intro" type="text" className={fieldClass} />
        <FieldError message={errors.intro} />
      </label>

      <label className="block">
        <span className={labelClass}>{copy.submit.contentLabel}</span>
        <textarea name="content" required rows={16} className={fieldClass} />
        <FieldError message={errors.content} />
      </label>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>{copy.submit.authorNameLabel}</span>
          <input name="authorName" type="text" className={fieldClass} />
          <FieldError message={errors.authorName} />
        </label>
        <label className="block">
          <span className={labelClass}>{copy.submit.authorLinkLabel}</span>
          <input name="authorLink" type="url" className={fieldClass} />
          <FieldError message={errors.authorLink} />
        </label>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>{copy.submit.authorEmailLabel}</span>
          <input name="authorEmail" type="email" className={fieldClass} />
          <FieldError message={errors.authorEmail} />
        </label>
        <label className="block">
          <span className={labelClass}>{copy.submit.tagsLabel}</span>
          <input name="tags" type="text" className={fieldClass} />
          <FieldError message={errors.tags} />
        </label>
      </div>

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[12px] border border-crimson bg-gradient-to-b from-crimson-2 to-crimson-deep px-6 py-3 text-[14px] font-medium text-white disabled:opacity-60"
        >
          {pending ? copy.submit.submitting : copy.submit.submitButton}
        </button>
      </div>
    </form>
  );
}
