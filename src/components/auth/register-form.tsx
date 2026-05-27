"use client";

import { useActionState, useState } from "react";
import { Building2, Eye, EyeOff, ImagePlus, X } from "lucide-react";
import Image from "next/image";
import type { AuthActionState } from "@/app/auth/actions";
import type { SupportedLocale } from "@/i18n/catalog";

export type RegisterFormLabels = {
  step: string;
  title: string;
  shopName: string;
  shopNamePlaceholder: string;
  ownerName: string;
  ownerNamePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  password: string;
  passwordPlaceholder: string;
  confirmPassword: string;
  confirmPasswordPlaceholder: string;
  showPassword: string;
  hidePassword: string;
  country: string;
  countryValue: string;
  logo: string;
  logoHelp: string;
  logoSelected: string;
  removeLogo: string;
  submit: string;
  errorMessages: Record<string, string>;
};

type RegisterFormProps = {
  labels: RegisterFormLabels;
  locale: SupportedLocale;
  action: (state: AuthActionState, formData: FormData) => Promise<AuthActionState>;
};

const initialActionState: AuthActionState = {};

export function RegisterForm({ labels, locale, action }: RegisterFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialActionState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);

  return (
    <div className="rounded-[2rem] border border-border bg-surface p-4 shadow-2xl shadow-emerald-100/70 sm:p-6">
      <div className="rounded-[1.5rem] border border-border bg-bg p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{labels.step}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">{labels.title}</h2>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-text text-surface">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <form action={formAction} className="mt-6 grid gap-5">
          <input type="hidden" name="countryCode" value="AZ" />
          <input type="hidden" name="locale" value={locale} />
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={labels.shopName} name="shopName" placeholder={labels.shopNamePlaceholder} />
            <Field label={labels.country} name="country" value={labels.countryValue} readOnly />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label={labels.ownerName} name="ownerName" placeholder={labels.ownerNamePlaceholder} />
            <Field label={labels.email} name="email" type="email" placeholder={labels.emailPlaceholder} />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <PasswordField
              label={labels.password}
              name="password"
              placeholder={labels.passwordPlaceholder}
              visible={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              showLabel={labels.showPassword}
              hideLabel={labels.hidePassword}
            />
            <PasswordField
              label={labels.confirmPassword}
              name="confirmPassword"
              placeholder={labels.confirmPasswordPlaceholder}
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((value) => !value)}
              showLabel={labels.showPassword}
              hideLabel={labels.hidePassword}
            />
          </div>

          <label className="grid cursor-pointer gap-3 rounded-2xl border border-dashed border-border bg-surface p-5 transition hover:border-accent">
            <span className="flex items-center gap-3 text-sm font-bold">
              <ImagePlus className="h-5 w-5 text-accent" aria-hidden="true" />
              {labels.logo}
            </span>
            <span className="text-sm leading-6 text-muted">{labels.logoHelp}</span>
            <input
              className="sr-only"
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }

                if (logoPreview) {
                  URL.revokeObjectURL(logoPreview);
                }

                setLogoPreview(URL.createObjectURL(file));
                setLogoName(file.name);
              }}
            />
            {logoPreview ? (
              <span className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-bg p-3">
                <span className="flex min-w-0 items-center gap-3">
                  <Image
                    src={logoPreview}
                    alt=""
                    width={48}
                    height={48}
                    unoptimized
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{labels.logoSelected}</span>
                    <span className="block truncate text-xs font-semibold text-muted">{logoName}</span>
                  </span>
                </span>
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted hover:text-text"
                  aria-label={labels.removeLogo}
                  onClick={(event) => {
                    event.preventDefault();
                    if (logoPreview) {
                      URL.revokeObjectURL(logoPreview);
                    }
                    setLogoPreview(null);
                    setLogoName(null);
                  }}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </span>
            ) : null}
          </label>

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
        </form>
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  value?: string;
  readOnly?: boolean;
};

function Field({ label, name, placeholder, type = "text", value, readOnly = false }: FieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={value}
        readOnly={readOnly}
        className="h-12 rounded-2xl border border-border bg-surface px-4 text-sm font-semibold text-text outline-none transition placeholder:text-muted/70 focus:border-accent"
      />
    </label>
  );
}

type PasswordFieldProps = {
  label: string;
  name: string;
  placeholder: string;
  visible: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
};

function PasswordField({ label, name, placeholder, visible, onToggle, showLabel, hideLabel }: PasswordFieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold">{label}</span>
      <span className="relative block">
        <input
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          className="h-12 w-full rounded-2xl border border-border bg-surface px-4 pr-12 text-sm font-semibold text-text outline-none transition placeholder:text-muted/70 focus:border-accent"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-bg hover:text-text"
          aria-label={visible ? hideLabel : showLabel}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </span>
    </label>
  );
}
