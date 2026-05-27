import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, CheckCircle2, ImageIcon, MapPin, Settings, Sparkles } from "lucide-react";
import { updateBranchSettingsAction, updateTenantSettingsAction } from "@/app/settings/actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { createTranslator, loadMessages, toSupportedLocale } from "@/i18n/messages";
import { getAuthSession } from "@/lib/auth-session";
import { formatMoneyMinor } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";
import { getSubscriptionPlanLimits } from "@/lib/subscription-plans";

export const dynamic = "force-dynamic";

type SettingsRouteProps = {
  searchParams: Promise<{
    locale?: string;
    message?: string;
    shopId?: string;
  }>;
};

export default async function SettingsRoute({ searchParams }: SettingsRouteProps) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "settings")) {
    redirect(`/dashboard?locale=${session.countryCode === "AZ" ? "az" : "en"}`);
  }

  const params = await searchParams;
  const locale = toSupportedLocale(params.locale);
  const messages = await loadMessages(locale);
  const t = createTranslator(messages);
  const data = await loadSettingsData(session.tenantId, session.countryCode, session.role, session.shopId, params.shopId);
  const noticeKey = safeSettingsMessageKey(params.message) ? params.message : null;
  const languageLabels = {
    az: t("common.language.az"),
    ru: t("common.language.ru"),
    en: t("common.language.en"),
  };

  return (
    <main className="min-h-screen bg-bg px-5 py-6 text-text sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/dashboard?locale=${locale}&shopId=${data.selectedShop.id}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("settings.back")}
          </Link>
          <LanguageSwitcher locale={locale} labels={languageLabels} basePath="/settings" />
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("dashboard.branch.title")}</p>
              <div className="mt-4 space-y-2">
                {data.shops.map((shop) => (
                  <Link
                    key={shop.id}
                    href={`/settings?locale=${locale}&shopId=${shop.id}`}
                    className={[
                      "block rounded-2xl border px-4 py-3 text-sm font-bold transition",
                      shop.id === data.selectedShop.id
                        ? "border-text bg-text text-surface"
                        : "border-border bg-bg text-text hover:border-text",
                    ].join(" ")}
                  >
                    {shop.name}
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("settings.plan.label")}</p>
              <p className="mt-3 text-3xl font-semibold">{t(`settings.planName.${data.tenant.plan}`)}</p>
              <p className="mt-2 text-sm font-semibold text-muted">
                {t("settings.country")}: {data.country.nativeName}
              </p>
              <div className="mt-4 grid gap-2 text-sm font-semibold text-muted">
                <p>
                  {t("settings.subscription.branches")
                    .replace("{used}", String(data.usage.activeShopCount))
                    .replace("{limit}", String(data.subscription.maxShops))}
                </p>
                <p>
                  {t("settings.subscription.staff")
                    .replace("{used}", String(data.usage.activeStaffCount))
                    .replace("{limit}", String(data.subscription.maxStaff))}
                </p>
                <p>{t("settings.subscription.ai")}: {data.subscription.aiLimitLabel}</p>
              </div>
            </section>
          </aside>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("settings.label")}</p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-5xl">{t("settings.title")}</h1>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-muted">{t("settings.subtitle")}</p>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Settings className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>

              {noticeKey ? (
                <p className="mt-6 rounded-2xl border border-success/20 bg-success/10 p-4 text-sm font-bold text-success">
                  {t(noticeKey)}
                </p>
              ) : null}
            </section>

            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("settings.subscription.label")}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal">{t("settings.subscription.title")}</h2>
                  <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-muted">{t("settings.subscription.subtitle")}</p>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <Sparkles className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-3">
                {PLAN_CARDS.map((plan) => (
                  <div
                    key={plan.name}
                    className={[
                      "rounded-3xl border p-5",
                      plan.name === data.tenant.plan ? "border-text bg-bg" : "border-border bg-bg",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t(plan.labelKey)}</p>
                        <h3 className="mt-2 text-2xl font-semibold">{t(`settings.planName.${plan.name}`)}</h3>
                      </div>
                      {plan.name === data.tenant.plan ? (
                        <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                          {t("settings.subscription.current")}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-5 space-y-3">
                      {plan.featureKeys.map((featureKey) => (
                        <p key={featureKey} className="flex items-start gap-2 text-sm font-semibold leading-6 text-muted">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                          <span>{t(featureKey)}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              {session.role === "SHOP_OWNER" ? (
                <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                      <ImageIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("settings.business.label")}</p>
                      <h2 className="mt-1 text-2xl font-semibold tracking-normal">{t("settings.business.title")}</h2>
                    </div>
                  </div>

                  <form action={updateTenantSettingsAction} className="mt-6 grid gap-4">
                    <input type="hidden" name="locale" value={locale} />
                    <Field label={t("settings.business.name")}>
                      <input
                        name="name"
                        defaultValue={data.tenant.name}
                        className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                        required
                      />
                    </Field>
                    <Field label={t("settings.business.logoFile")}>
                      <input
                        name="logoFile"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="w-full rounded-2xl border border-border bg-bg px-3 py-2 text-sm font-semibold text-text outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-text file:px-4 file:py-2 file:text-sm file:font-bold file:text-surface focus:border-text"
                      />
                    </Field>
                    <p className="text-sm font-semibold leading-6 text-muted">{t("settings.business.logoHelp")}</p>
                    {data.tenant.logoUrl ? (
                      <div className="rounded-3xl border border-border bg-bg p-4">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="h-12 w-12 rounded-2xl bg-cover bg-center"
                            style={{ backgroundImage: `url(${data.tenant.logoUrl})` }}
                          />
                          <p className="text-sm font-bold">{t("settings.business.logoPreview")}</p>
                        </div>
                        <label className="mt-4 flex items-center gap-3 text-sm font-bold text-muted">
                          <input
                            type="checkbox"
                            name="removeLogo"
                            className="h-4 w-4 rounded border-border bg-bg text-accent"
                          />
                          <span>{t("settings.business.removeLogo")}</span>
                        </label>
                      </div>
                    ) : null}
                    <button
                      type="submit"
                      className="rounded-2xl bg-text px-5 py-3 text-sm font-bold text-surface transition hover:opacity-90"
                    >
                      {t("settings.save")}
                    </button>
                  </form>
                </section>
              ) : null}

              <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                    <Building2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("settings.branch.label")}</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-normal">{t("settings.branch.title")}</h2>
                  </div>
                </div>

                <form action={updateBranchSettingsAction} className="mt-6 grid gap-4">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="shopId" value={data.selectedShop.id} />
                  <Field label={t("settings.branch.name")}>
                    <input
                      name="name"
                      defaultValue={data.selectedShop.name}
                      className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                      required
                    />
                  </Field>
                  <Field label={t("settings.branch.address")}>
                    <input
                      name="address"
                      defaultValue={data.selectedShop.address ?? ""}
                      className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("settings.branch.lat")}>
                      <input
                        name="lat"
                        defaultValue={data.selectedShop.lat ?? ""}
                        inputMode="decimal"
                        placeholder="40.4093"
                        className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                      />
                    </Field>
                    <Field label={t("settings.branch.lng")}>
                      <input
                        name="lng"
                        defaultValue={data.selectedShop.lng ?? ""}
                        inputMode="decimal"
                        placeholder="49.8671"
                        className="h-11 w-full rounded-2xl border border-border bg-bg px-3 text-sm font-semibold text-text outline-none transition focus:border-text"
                      />
                    </Field>
                  </div>
                  <p className="inline-flex items-start gap-2 text-sm font-semibold leading-6 text-muted">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    {t("settings.branch.mapLater")}
                  </p>
                  <button
                    type="submit"
                    className="rounded-2xl bg-text px-5 py-3 text-sm font-bold text-surface transition hover:opacity-90"
                  >
                    {t("settings.save")}
                  </button>
                </form>
              </section>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

type FieldProps = {
  children: React.ReactNode;
  label: string;
};

function Field({ children, label }: FieldProps) {
  return (
    <label className="space-y-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
      <span>{label}</span>
      {children}
    </label>
  );
}

const PLAN_CARDS = [
  {
    name: "START",
    labelKey: "settings.subscription.planLabel",
    featureKeys: [
      "settings.planFeature.startBranches",
      "settings.planFeature.startStaff",
      "settings.planFeature.inventory",
      "settings.planFeature.qr",
      "settings.planFeature.languages",
    ],
  },
  {
    name: "PRO",
    labelKey: "settings.subscription.planLabel",
    featureKeys: [
      "settings.planFeature.proBranches",
      "settings.planFeature.proStaff",
      "settings.planFeature.finance",
      "settings.planFeature.libraryAi",
      "settings.planFeature.notifications",
    ],
  },
  {
    name: "PREMIUM",
    labelKey: "settings.subscription.planLabel",
    featureKeys: [
      "settings.planFeature.premiumBranches",
      "settings.planFeature.premiumStaff",
      "settings.planFeature.advancedAnalytics",
      "settings.planFeature.integrationsLater",
      "settings.planFeature.prioritySupport",
    ],
  },
] as const;

function safeSettingsMessageKey(value: string | undefined): value is string {
  return typeof value === "string" && (value === "settings.saved" || value.startsWith("settings.error."));
}

async function loadSettingsData(
  tenantId: string,
  countryCode: string,
  role: string,
  sessionShopId: string,
  requestedShopId: string | undefined,
) {
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantId,
      countryCode,
    },
    select: {
      country: {
        select: {
          nativeName: true,
        },
      },
      logoUrl: true,
      name: true,
      plan: true,
      subscription: {
        select: {
          aiMonthlyLimitMinorUsd: true,
          currentPeriodEnd: true,
          maxShops: true,
          maxStaff: true,
          status: true,
        },
      },
      shops: {
        where: {
          isActive: true,
          ...(role === "SHOP_OWNER" ? {} : { id: sessionShopId }),
        },
        select: {
          address: true,
          id: true,
          lat: true,
          lng: true,
          name: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!tenant || tenant.shops.length === 0) {
    redirect("/login?locale=ru");
  }

  const selectedShop = tenant.shops.find((shop) => shop.id === requestedShopId) ?? tenant.shops[0];
  const activeStaffUsers = await prisma.membership.findMany({
    where: {
      isActive: true,
      shop: {
        tenantId,
        countryCode,
      },
    },
    distinct: ["userId"],
    select: {
      userId: true,
    },
  });
  const planLimits = getSubscriptionPlanLimits(tenant.plan);
  const subscription = tenant.subscription ?? {
    aiMonthlyLimitMinorUsd: planLimits.aiMonthlyLimitMinorUsd,
    currentPeriodEnd: null,
    maxShops: planLimits.maxShops,
    maxStaff: planLimits.maxStaff,
    status: "TRIALING",
  };

  return {
    country: tenant.country,
    selectedShop: {
      ...selectedShop,
      lat: selectedShop.lat?.toString() ?? null,
      lng: selectedShop.lng?.toString() ?? null,
    },
    shops: tenant.shops,
    tenant: {
      logoUrl: tenant.logoUrl,
      name: tenant.name,
      plan: tenant.plan,
    },
    subscription: {
      aiLimitLabel: formatMoneyMinor(subscription.aiMonthlyLimitMinorUsd, "USD", "en"),
      currentPeriodEnd: subscription.currentPeriodEnd,
      maxShops: subscription.maxShops,
      maxStaff: subscription.maxStaff,
      status: subscription.status,
    },
    usage: {
      activeShopCount: tenant.shops.length,
      activeStaffCount: activeStaffUsers.length,
    },
  };
}
