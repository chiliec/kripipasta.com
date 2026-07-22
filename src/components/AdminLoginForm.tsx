"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/admin/login/actions";
import { copy } from "@/lib/ui-copy";

const initial: LoginState = {};

export default function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4">
      {state.error && (
        <p className="rounded-[11px] border border-crimson-deep bg-crimson/10 px-4 py-3 text-[13px] text-crimson-2">
          {copy.admin.loginError}
        </p>
      )}
      <label className="block">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-tx3">
          {copy.admin.passwordLabel}
        </span>
        <input
          name="password"
          type="password"
          required
          autoFocus
          className="mt-2 w-full rounded-[11px] border border-line bg-s1 px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-line2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-[12px] border border-crimson bg-gradient-to-b from-crimson-2 to-crimson-deep px-6 py-3 text-[14px] font-medium text-white disabled:opacity-60"
      >
        {copy.admin.loginButton}
      </button>
    </form>
  );
}
