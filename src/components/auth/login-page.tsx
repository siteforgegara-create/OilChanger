import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, QrCode, ShieldCheck } from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { LoginForm, type LoginFormLabels } from "@/components/auth/login-form";
import { loginAction } from "@/app/auth/actions";
import type { SupportedLocale } from "@/i18n/catalog";

type LoginPageProps = {
  locale: SupportedLocale;
  t: (key: string) => string;
};

const valueKeys = ["login.side.queue", "login.side.inventory", "login.side.privacy"] as const;

export function LoginPage({ locale, t }: LoginPageProps) {
  const languageLabels = {
    az: t("common.language.az"),
    ru: t("common.language.ru"),
    en: t("common.language.en"),
  };

  const formLabels: LoginFormLabels = {
    step: t("login.form.step"),
    title: t("login.form.title"),
    email: t("login.form.email"),
    emailPlaceholder: t("login.form.emailPlaceholder"),
    password: t("login.form.password"),
    passwordPlaceholder: t("login.form.passwordPlaceholder"),
    showPassword: t("login.form.showPassword"),
    hidePassword: t("login.form.hidePassword"),
    remember: t("login.form.remember"),
    forgot: t("login.form.forgot"),
    submit: t("login.form.submit"),
    google: t("login.form.google"),
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
          <LanguageSwitcher locale={locale} labels={languageLabels} basePath="/login" />
          <Link
            href={`/register?locale=${locale}`}
            className="hidden rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text sm:inline-flex"
          >
            {t("login.header.register")}
          </Link>
        </div>
      </header>

      <section className="mx-0 grid max-w-[390px] gap-8 px-5 pb-16 pt-6 sm:mx-auto sm:max-w-7xl sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:pt-12">
        <aside className="max-w-[350px] sm:max-w-2xl">
          <Link
            href={`/?locale=${locale}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("login.back")}
          </Link>

          <h1 className="mt-8 text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">{t("login.title")}</h1>
          <p className="mt-5 text-base leading-8 text-muted sm:text-lg">{t("login.subtitle")}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <SignalCard icon={<Clock3 className="h-5 w-5" aria-hidden="true" />} title={t("login.metrics.queue")} />
            <SignalCard icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />} title={t("login.metrics.scope")} />
            <SignalCard icon={<QrCode className="h-5 w-5" aria-hidden="true" />} title={t("login.metrics.qr")} />
          </div>

          <ul className="mt-8 space-y-3 rounded-3xl border border-border bg-surface p-5 shadow-sm">
            {valueKeys.map((key) => (
              <li key={key} className="flex items-center gap-3 text-sm font-semibold">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </aside>

        <LoginForm labels={formLabels} locale={locale} action={loginAction} />
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

type SignalCardProps = {
  icon: React.ReactNode;
  title: string;
};

function SignalCard({ icon, title }: SignalCardProps) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-4 shadow-sm">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/10 text-accent">{icon}</div>
      <p className="mt-4 text-sm font-bold leading-5">{title}</p>
    </div>
  );
}
