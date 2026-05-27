import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { RegisterForm, type RegisterFormLabels } from "@/components/auth/register-form";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { registerShopAction } from "@/app/auth/actions";
import type { SupportedLocale } from "@/i18n/catalog";

type RegisterPageProps = {
  locale: SupportedLocale;
  t: (key: string) => string;
};

const checklistKeys = [
  "register.side.queue",
  "register.side.inventory",
  "register.side.qr",
] as const;

export function RegisterPage({ locale, t }: RegisterPageProps) {
  const languageLabels = {
    az: t("common.language.az"),
    ru: t("common.language.ru"),
    en: t("common.language.en"),
  };
  const formLabels: RegisterFormLabels = {
    step: t("register.form.step"),
    title: t("register.form.title"),
    shopName: t("register.form.shopName"),
    shopNamePlaceholder: t("register.form.shopNamePlaceholder"),
    ownerName: t("register.form.ownerName"),
    ownerNamePlaceholder: t("register.form.ownerNamePlaceholder"),
    email: t("register.form.email"),
    emailPlaceholder: t("register.form.emailPlaceholder"),
    password: t("register.form.password"),
    passwordPlaceholder: t("register.form.passwordPlaceholder"),
    confirmPassword: t("register.form.confirmPassword"),
    confirmPasswordPlaceholder: t("register.form.confirmPasswordPlaceholder"),
    showPassword: t("register.form.showPassword"),
    hidePassword: t("register.form.hidePassword"),
    country: t("register.form.country"),
    countryValue: t("register.form.countryValue"),
    logo: t("register.form.logo"),
    logoHelp: t("register.form.logoHelp"),
    logoSelected: t("register.form.logoSelected"),
    removeLogo: t("register.form.removeLogo"),
    submit: t("register.form.submit"),
    errorMessages: authErrorMessages(t),
  };

  return (
    <main className="min-h-screen bg-bg text-text">
      <header className="mx-0 flex w-full max-w-[390px] items-center justify-between gap-3 px-5 py-5 sm:mx-auto sm:max-w-7xl sm:px-8">
        <Link href={`/?locale=${locale}`} className="flex items-center gap-3" aria-label={t("common.brandName")}>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-text text-sm font-black text-surface">
            OC
          </span>
          <span className="hidden text-base font-bold sm:inline">{t("common.brandName")}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} labels={languageLabels} basePath="/register" />
          <Link
            href={`/login?locale=${locale}`}
            className="hidden rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text sm:inline-flex"
          >
            {t("register.header.login")}
          </Link>
        </div>
      </header>

      <section className="mx-0 grid max-w-[390px] gap-8 px-5 pb-16 pt-6 sm:mx-auto sm:max-w-7xl sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start lg:pt-12">
        <aside className="max-w-[350px] sm:max-w-xl">
          <Link
            href={`/?locale=${locale}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("register.back")}
          </Link>
          <h1 className="mt-8 text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">{t("register.title")}</h1>
          <p className="mt-5 text-base leading-8 text-muted sm:text-lg">{t("register.subtitle")}</p>

          <div className="mt-8 rounded-3xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold">{t("register.side.title")}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{t("register.side.text")}</p>
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {checklistKeys.map((key) => (
                <li key={key} className="flex items-center gap-3 text-sm font-semibold">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <RegisterForm labels={formLabels} locale={locale} action={registerShopAction} />
      </section>
    </main>
  );
}

function authErrorMessages(t: (key: string) => string): Record<string, string> {
  return {
    "auth.error.validation": t("auth.error.validation"),
    "auth.error.emailExists": t("auth.error.emailExists"),
    "auth.error.invalidCredentials": t("auth.error.invalidCredentials"),
    "auth.error.noAccess": t("auth.error.noAccess"),
    "auth.error.unexpected": t("auth.error.unexpected"),
  };
}
