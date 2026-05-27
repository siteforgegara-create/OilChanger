"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import type { AuthActionState } from "@/app/auth/actions";
import type { SupportedLocale } from "@/i18n/catalog";

export type LoginFormLabels = {
  step: string;
  title: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  showPassword: string;
  hidePassword: string;
  remember: string;
  forgot: string;
  submit: string;
  google: string;
  errorMessages: Record<string, string>;
};

type LoginFormProps = {
  labels: LoginFormLabels;
  locale: SupportedLocale;
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
};

const initialActionState: AuthActionState = {};

export function LoginForm({ labels, locale, action }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialActionState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="rounded-[2rem] border border-border bg-surface p-4 shadow-2xl shadow-emerald-100/70 sm:p-6">
      <div className="rounded-[1.5rem] border border-border bg-bg p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{labels.step}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">{labels.title}</h2>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-text text-surface">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <form action={formAction} className="mt-6 grid gap-5">
          <input type="hidden" name="locale" value={locale} />
          <label className="grid gap-2">
            <span className="text-sm font-bold">{labels.email}</span>
            <span className="relative block">
              <Mail
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                name="email"
                type="email"
                placeholder={labels.emailPlaceholder}
                className="h-12 w-full rounded-2xl border border-border bg-surface px-11 text-sm font-semibold text-text outline-none transition placeholder:text-muted/70 focus:border-accent"
              />
            </span>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-bold">{labels.password}</span>
            <span className="relative block">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder={labels.passwordPlaceholder}
                className="h-12 w-full rounded-2xl border border-border bg-surface px-4 pr-12 text-sm font-semibold text-text outline-none transition placeholder:text-muted/70 focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-bg hover:text-text"
                aria-label={showPassword ? labels.hidePassword : labels.showPassword}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-muted">
              <input
                type="checkbox"
                name="remember"
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              />
              <span>{labels.remember}</span>
            </label>
            <Link href="#" className="text-sm font-bold text-accent">
              {labels.forgot}
            </Link>
          </div>

          {state.errorKey ? (
            <p className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-bold text-danger">
              {labels.errorMessages[state.errorKey] ?? state.errorKey}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-bold text-white shadow-sm shadow-accent/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {labels.submit}
          </button>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-5 py-3 text-sm font-bold text-text transition hover:border-text"
          >
            {labels.google}
          </button>
        </form>
      </div>
    </div>
  );
}
