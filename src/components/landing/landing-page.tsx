import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Building2,
  CarFront,
  CheckCircle2,
  Gauge,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import type { SupportedLocale } from "@/i18n/catalog";

type LandingPageProps = {
  locale: SupportedLocale;
  t: (key: string) => string;
};

const previewMetrics = [
  { key: "landing.preview.queue", value: "08" },
  { key: "landing.preview.inService", value: "03" },
  { key: "landing.preview.completed", value: "17" },
] as const;

const featureKeys = [
  { key: "landing.features.operations", icon: Gauge },
  { key: "landing.features.inventory", icon: Boxes },
  { key: "landing.features.history", icon: CarFront },
] as const;

const plans = [
  {
    nameKey: "landing.pricing.start",
    descriptionKey: "landing.pricing.startDescription",
    icon: Building2,
    featured: false,
    features: [
      "landing.pricing.startFeatureBranches",
      "landing.pricing.startFeatureStaff",
      "landing.pricing.allPlansInventory",
      "landing.pricing.allPlansQr",
      "landing.pricing.featureQueue",
      "landing.pricing.featureInventory",
      "landing.pricing.featureQr",
    ],
  },
  {
    nameKey: "landing.pricing.pro",
    descriptionKey: "landing.pricing.proDescription",
    icon: Gauge,
    featured: true,
    features: [
      "landing.pricing.proFeatureBranches",
      "landing.pricing.proFeatureStaff",
      "landing.pricing.allPlansInventory",
      "landing.pricing.allPlansQr",
      "landing.pricing.featureFinance",
      "landing.pricing.featureAiLimit",
      "landing.pricing.featureSharedHistory",
    ],
  },
  {
    nameKey: "landing.pricing.premium",
    descriptionKey: "landing.pricing.premiumDescription",
    icon: ShieldCheck,
    featured: false,
    features: [
      "landing.pricing.premiumFeatureSupport",
      "landing.pricing.premiumFeatureAdmin",
      "landing.pricing.allPlansInventory",
      "landing.pricing.allPlansQr",
      "landing.pricing.featureAdvancedReports",
      "landing.pricing.featureAiLimit",
      "landing.pricing.featureSharedHistory",
    ],
  },
] as const;

export function LandingPage({ locale, t }: LandingPageProps) {
  const languageLabels = {
    az: t("common.language.az"),
    ru: t("common.language.ru"),
    en: t("common.language.en"),
  };

  return (
    <main className="min-h-screen overflow-hidden bg-bg text-text">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(circle_at_70%_20%,rgba(var(--color-accent),0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.84),rgba(var(--color-bg),0))]" />

      <header className="mx-0 flex w-full max-w-[390px] items-center justify-between gap-3 overflow-hidden px-5 py-5 sm:mx-auto sm:max-w-7xl sm:px-8">
        <Link href={`/?locale=${locale}`} className="flex items-center gap-3" aria-label={t("common.brandName")}>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-text text-sm font-black text-surface">
            OC
          </span>
          <span className="hidden text-base font-bold tracking-normal sm:inline">{t("common.brandName")}</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-muted md:flex">
          <a href="#features" className="hover:text-text">
            {t("landing.nav.features")}
          </a>
          <a href="#pricing" className="hover:text-text">
            {t("landing.nav.pricing")}
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher locale={locale} labels={languageLabels} />
          <Link
            href={`/login?locale=${locale}`}
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-muted transition hover:text-text sm:inline-flex"
          >
            {t("landing.nav.login")}
          </Link>
          <Link
            href={`/register?locale=${locale}`}
            className="hidden rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition hover:opacity-90 sm:inline-flex"
          >
            {t("landing.nav.signIn")}
          </Link>
        </div>
      </header>

      <section className="mx-0 grid w-full min-w-0 max-w-[390px] gap-10 px-5 pb-16 pt-10 sm:mx-auto sm:max-w-7xl sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:pb-24 lg:pt-16">
        <div className="w-full min-w-0 max-w-[350px] sm:max-w-2xl">
          <h1 className="max-w-[350px] break-words text-[2.65rem] font-semibold leading-[1.04] tracking-normal text-text sm:max-w-3xl sm:text-6xl">
            {t("landing.hero.title")}
          </h1>
          <p className="mt-6 max-w-[350px] text-lg leading-8 text-muted sm:max-w-xl">{t("landing.hero.subtitle")}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={`/register?locale=${locale}`}
              className="inline-flex items-center gap-2 rounded-full bg-text px-5 py-3 text-sm font-bold text-surface transition hover:opacity-90"
            >
              {t("landing.hero.primaryCta")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={`/login?locale=${locale}`}
              className="inline-flex items-center rounded-full border border-border bg-surface px-5 py-3 text-sm font-bold text-text transition hover:border-text"
            >
              {t("landing.hero.secondaryCta")}
            </Link>
          </div>
        </div>

        <div className="relative w-full min-w-0 max-w-[350px] sm:max-w-none">
          <div className="absolute -left-6 top-8 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative min-w-0 overflow-hidden rounded-[2rem] border border-border bg-surface p-3 shadow-2xl shadow-emerald-100/70 sm:p-4">
            <div className="min-w-0 overflow-hidden rounded-[1.5rem] border border-border bg-bg p-4">
              <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("landing.preview.today")}</p>
                  <p className="mt-1 text-lg font-bold text-text">{t("landing.features.operations")}</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-text text-surface">
                  <Gauge className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                {previewMetrics.map((metric) => (
                  <div key={metric.key} className="min-w-0 rounded-2xl border border-border bg-surface p-3 sm:p-4">
                    <p className="font-technical text-xl font-semibold sm:text-2xl">{metric.value}</p>
                    <p className="mt-2 truncate text-[0.68rem] font-semibold text-muted sm:text-xs">{t(metric.key)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                <PreviewRow icon={CarFront} title="Mercedes C200" meta="10-AA-777" tone="accent" />
                <PreviewRow icon={QrCode} title={t("landing.preview.qrRecord")} meta="VIN JHM***********Z01" tone="success" />
                <PreviewRow icon={Boxes} title={t("landing.preview.inventoryWarning")} meta="5W-30 · 2.4 L" tone="warning" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-border bg-surface/85">
        <div className="mx-0 grid max-w-[390px] gap-8 px-5 py-14 sm:mx-auto sm:max-w-7xl sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <h2 className="max-w-[350px] text-3xl font-semibold leading-tight tracking-normal sm:max-w-xl">
            {t("landing.features.title")}
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {featureKeys.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.key} className="rounded-2xl border border-border bg-bg p-5">
                  <Icon className="h-5 w-5 text-accent" aria-hidden="true" />
                  <p className="mt-5 break-words text-sm font-bold leading-6">{t(feature.key)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-0 max-w-[390px] px-5 py-16 sm:mx-auto sm:max-w-7xl sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="max-w-[350px] sm:max-w-2xl">
            <h2 className="text-3xl font-semibold leading-tight tracking-normal sm:text-5xl">
              {t("landing.promo.title")}
            </h2>
            <p className="mt-5 text-base leading-8 text-muted sm:text-lg">{t("landing.promo.subtitle")}</p>

            <div className="mt-8 grid gap-3">
              {[
                ["landing.promo.pointQueue", Gauge],
                ["landing.promo.pointVehicle", CarFront],
                ["landing.promo.pointMoney", Boxes],
              ].map(([key, Icon]) => (
                <div key={key as string} className="flex gap-4 rounded-2xl border border-border bg-surface p-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-semibold leading-6 text-text">{t(key as string)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative max-w-[350px] sm:max-w-none">
            <div className="absolute -bottom-6 left-8 right-8 h-20 rounded-full bg-accent/20 blur-3xl" />
            <figure className="relative overflow-hidden rounded-[2rem] border border-border bg-surface p-2 shadow-2xl shadow-emerald-100/80">
              <Image
                src="https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1400&q=85"
                alt={t("landing.promo.imageAlt")}
                width={1400}
                height={875}
                className="aspect-[16/10] w-full rounded-[1.5rem] object-cover"
              />
              <figcaption className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/40 bg-white/85 p-4 shadow-lg backdrop-blur">
                <p className="text-sm font-bold text-text">{t("landing.promo.captionTitle")}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-muted">{t("landing.promo.captionText")}</p>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-0 max-w-[390px] px-5 py-16 sm:mx-auto sm:max-w-7xl sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal sm:text-4xl">{t("landing.pricing.title")}</h2>
            <p className="mt-3 max-w-[350px] text-base leading-7 text-muted sm:max-w-2xl">{t("landing.pricing.subtitle")}</p>
          </div>
          <Sparkles className="hidden h-7 w-7 text-accent sm:block" aria-hidden="true" />
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <article
                key={plan.nameKey}
                className={[
                  "relative overflow-hidden rounded-3xl border bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl",
                  plan.featured ? "border-accent shadow-emerald-100" : "border-border",
                ].join(" ")}
              >
                {plan.featured ? <div className="absolute inset-x-0 top-0 h-1 bg-accent" /> : null}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-2xl font-bold tracking-normal">{t(plan.nameKey)}</p>
                    <p className="mt-3 min-h-14 text-sm leading-6 text-muted">{t(plan.descriptionKey)}</p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                </div>

                <ul className="mt-7 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 text-sm font-semibold leading-6 text-text">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                      <span>{t(feature)}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/register?locale=${locale}`}
                  className={[
                    "mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition",
                    plan.featured
                      ? "bg-accent text-white shadow-sm shadow-accent/20 hover:opacity-90"
                      : "border border-border bg-bg text-text hover:border-accent",
                  ].join(" ")}
                >
                  {t("landing.pricing.cardCta")}
                </Link>
              </article>
            );
          })}
        </div>

      </section>
    </main>
  );
}

type PreviewRowProps = {
  icon: typeof CarFront;
  title: string;
  meta: string;
  tone: "accent" | "success" | "warning";
};

function PreviewRow({ icon: Icon, title, meta, tone }: PreviewRowProps) {
  const toneClass = {
    accent: "text-accent bg-accent/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
  }[tone];

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClass}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{title}</p>
        <p className="mt-1 truncate font-technical text-xs text-muted">{meta}</p>
      </div>
    </div>
  );
}
