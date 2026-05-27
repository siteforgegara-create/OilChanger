import Link from "next/link";
import type { UserRole } from "@prisma/client";
import { ArrowLeft, BookOpen, CheckCircle2, Clock3, Plus, Search, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import {
  addVehicleCatalogAction,
  addVehicleCatalogRecommendationAction,
} from "@/app/library/actions";
import { createTranslator, loadMessages, toSupportedLocale } from "@/i18n/messages";
import { calculateAiBudgetStatus, currentAiUsageMonth } from "@/lib/ai-usage";
import { getAuthSession } from "@/lib/auth-session";
import { formatMoneyMinor } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { canAccessAppRoute } from "@/lib/role-access";
import { getSubscriptionPlanLimits } from "@/lib/subscription-plans";

export const dynamic = "force-dynamic";

type LibraryRouteProps = {
  searchParams: Promise<{
    locale?: string;
    shopId?: string;
    catalogId?: string;
    q?: string;
    error?: string;
  }>;
};

export default async function LibraryRoute({ searchParams }: LibraryRouteProps) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login?locale=ru");
  }

  if (!canAccessAppRoute(session.role, "library")) {
    redirect(`/dashboard?locale=${session.countryCode === "AZ" ? "az" : "en"}`);
  }

  const params = await searchParams;
  const locale = toSupportedLocale(params.locale);
  const messages = await loadMessages(locale);
  const t = createTranslator(messages);
  const library = await loadLibraryData({
    countryCode: session.countryCode,
    role: session.role,
    selectedCatalogId: params.catalogId,
    sessionShopId: session.shopId,
    tenantId: session.tenantId,
    requestedShopId: params.shopId,
    search: params.q,
  });
  const errorKey = safeErrorKey(params.error);

  return (
    <main className="min-h-screen bg-bg px-5 py-6 text-text sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/dashboard?locale=${locale}&shopId=${library.selectedShopId}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("library.back")}
        </Link>

        <section className="mt-6 rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("library.label")}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-5xl">{t("library.title")}</h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-muted">{t("library.subtitle")}</p>
            </div>
            <form action="/library" className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-lg">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="shopId" value={library.selectedShopId} />
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  name="q"
                  defaultValue={params.q ?? ""}
                  placeholder={t("library.search.placeholder")}
                  className="h-12 w-full rounded-2xl border border-border bg-bg pl-11 pr-4 text-sm font-semibold text-text outline-none transition placeholder:text-muted/70 focus:border-accent"
                />
              </label>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-text px-5 py-3 text-sm font-bold text-surface transition hover:opacity-90"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                {t("library.search.submit")}
              </button>
            </form>
          </div>

          <div className="mt-6 grid gap-3 rounded-3xl border border-border bg-bg p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/10 text-accent">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold">{t("library.aiBudget.title")}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-muted">
                {t("library.aiBudget.subtitle")
                  .replace("{used}", library.aiBudget.usedLabel)
                  .replace("{limit}", library.aiBudget.limitLabel)
                  .replace("{remaining}", library.aiBudget.remainingLabel)}
              </p>
            </div>
            <span
              className={[
                "rounded-full px-3 py-1 text-xs font-bold",
                library.aiBudget.canRequest ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
              ].join(" ")}
            >
              {library.aiBudget.canRequest ? t("library.aiBudget.available") : t("library.aiBudget.limitReached")}
            </span>
          </div>

          {errorKey ? (
            <p className="mt-5 rounded-2xl border border-danger/20 bg-danger/10 p-4 text-sm font-bold text-danger">
              {t(`library.error.${errorKey}`)}
            </p>
          ) : null}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("library.list.label")}</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal">{t("library.list.title")}</h2>
                </div>
                <BookOpen className="h-6 w-6 text-accent" aria-hidden="true" />
              </div>

              {library.catalogs.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {library.catalogs.map((catalog) => (
                    <Link
                      key={catalog.id}
                      href={`/library?locale=${locale}&shopId=${library.selectedShopId}&catalogId=${catalog.id}&q=${encodeURIComponent(params.q ?? "")}`}
                      className={[
                        "block rounded-3xl border p-4 transition hover:border-text",
                        catalog.id === library.selectedCatalog?.id ? "border-text bg-text text-surface" : "border-border bg-bg text-text",
                      ].join(" ")}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-bold">
                            {catalog.make} {catalog.model}
                          </p>
                          <p className={catalog.id === library.selectedCatalog?.id ? "mt-1 text-sm font-semibold text-surface/70" : "mt-1 text-sm font-semibold text-muted"}>
                            {[catalog.generation, formatYearRange(catalog.yearFrom, catalog.yearTo), catalog.engineCode]
                              .filter(Boolean)
                              .join(" / ") || t("library.emptyValue")}
                          </p>
                        </div>
                        <span className={catalog.id === library.selectedCatalog?.id ? "text-xs font-bold text-surface/70" : "text-xs font-bold text-muted"}>
                          {t(`library.status.${catalog.status}`)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-3xl border border-dashed border-border bg-bg p-6 text-sm font-semibold text-muted">
                  {t("library.list.empty")}
                </p>
              )}
            </section>

            <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("library.form.label")}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">{t("library.form.title")}</h2>
              <form action={addVehicleCatalogAction} className="mt-5 grid gap-3">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="shopId" value={library.selectedShopId} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("library.form.make")}>
                    <input name="make" className={inputClassName} required />
                  </Field>
                  <Field label={t("library.form.model")}>
                    <input name="model" className={inputClassName} required />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label={t("library.form.generation")}>
                    <input name="generation" className={inputClassName} />
                  </Field>
                  <Field label={t("library.form.yearFrom")}>
                    <input name="yearFrom" inputMode="numeric" className={inputClassName} />
                  </Field>
                  <Field label={t("library.form.yearTo")}>
                    <input name="yearTo" inputMode="numeric" className={inputClassName} />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("library.form.engineCode")}>
                    <input name="engineCode" className={inputClassName} />
                  </Field>
                  <Field label={t("library.form.engineVolume")}>
                    <input name="engineVolume" inputMode="decimal" placeholder="2.0" className={inputClassName} />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label={t("library.form.fuelType")}>
                    <input name="fuelType" className={inputClassName} />
                  </Field>
                  <Field label={t("library.form.transmission")}>
                    <input name="transmission" className={inputClassName} />
                  </Field>
                  <Field label={t("library.form.bodyType")}>
                    <input name="bodyType" className={inputClassName} />
                  </Field>
                </div>
                <button
                  type="submit"
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-bold text-white shadow-sm shadow-accent/20 transition hover:opacity-90"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t("library.form.submit")}
                </button>
              </form>
            </section>
          </div>

          <section className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
            {library.selectedCatalog ? (
              <div>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("library.detail.label")}</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                      {library.selectedCatalog.make} {library.selectedCatalog.model}
                    </h2>
                    <p className="mt-3 text-sm font-semibold leading-6 text-muted">
                      {[
                        library.selectedCatalog.generation,
                        formatYearRange(library.selectedCatalog.yearFrom, library.selectedCatalog.yearTo),
                        library.selectedCatalog.engineCode,
                        library.selectedCatalog.engineVolume ? `${library.selectedCatalog.engineVolume}L` : null,
                      ]
                        .filter(Boolean)
                        .join(" / ") || t("library.emptyValue")}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-warning/10 px-4 py-2 text-xs font-bold text-warning">
                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                    {t(`library.status.${library.selectedCatalog.status}`)}
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <InfoTile label={t("library.form.fuelType")} value={library.selectedCatalog.fuelType ?? t("library.emptyValue")} />
                  <InfoTile label={t("library.form.transmission")} value={library.selectedCatalog.transmission ?? t("library.emptyValue")} />
                  <InfoTile label={t("library.form.bodyType")} value={library.selectedCatalog.bodyType ?? t("library.emptyValue")} />
                </div>

                <div className="mt-8">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("library.recommendations.label")}</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-normal">{t("library.recommendations.title")}</h3>
                    </div>
                    <Sparkles className="h-6 w-6 text-accent" aria-hidden="true" />
                  </div>

                  {library.selectedCatalog.recommendations.length > 0 ? (
                    <div className="mt-5 overflow-hidden rounded-3xl border border-border bg-bg">
                      {library.selectedCatalog.recommendations.map((recommendation) => (
                        <div key={recommendation.id} className="grid gap-3 border-b border-border p-4 last:border-b-0 lg:grid-cols-[1fr_auto]">
                          <div>
                            <p className="text-sm font-bold">
                              {t(`library.fluid.${recommendation.fluidType}`)} / {recommendation.viscosity}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-muted">
                              {recommendation.specification ?? t("library.emptyValue")} / {recommendation.volumeLiters}L
                            </p>
                            <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                              {formatInterval(recommendation.intervalKm, recommendation.intervalMonths, t)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                            <Badge>{t(`library.priority.${recommendation.priority}`)}</Badge>
                            <Badge>{t(`library.source.${recommendation.source}`)}</Badge>
                            <Badge>{t(`library.status.${recommendation.status}`)}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-5 rounded-3xl border border-dashed border-border bg-bg p-6 text-sm font-semibold text-muted">
                      {t("library.recommendations.empty")}
                    </p>
                  )}
                </div>

                <form action={addVehicleCatalogRecommendationAction} className="mt-8 grid gap-3 rounded-3xl border border-border bg-bg p-5">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="shopId" value={library.selectedShopId} />
                  <input type="hidden" name="catalogId" value={library.selectedCatalog.id} />
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{t("library.recommendationForm.label")}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t("library.recommendationForm.fluidType")}>
                      <select name="fluidType" className={inputClassName}>
                        <option value="ENGINE_OIL">{t("library.fluid.ENGINE_OIL")}</option>
                        <option value="TRANSMISSION_OIL">{t("library.fluid.TRANSMISSION_OIL")}</option>
                        <option value="POWER_STEERING">{t("library.fluid.POWER_STEERING")}</option>
                      </select>
                    </Field>
                    <Field label={t("library.recommendationForm.priority")}>
                      <select name="priority" className={inputClassName}>
                        <option value="RECOMMENDED">{t("library.priority.RECOMMENDED")}</option>
                        <option value="ALTERNATIVE">{t("library.priority.ALTERNATIVE")}</option>
                      </select>
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label={t("library.recommendationForm.viscosity")}>
                      <input name="viscosity" placeholder="5W-30" className={inputClassName} required />
                    </Field>
                    <Field label={t("library.recommendationForm.specification")}>
                      <input name="specification" placeholder="API SP" className={inputClassName} />
                    </Field>
                    <Field label={t("library.recommendationForm.volume")}>
                      <input name="volumeLiters" inputMode="decimal" placeholder="4.5" className={inputClassName} required />
                    </Field>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t("library.recommendationForm.intervalKm")}>
                      <input name="intervalKm" inputMode="numeric" placeholder="8000" className={inputClassName} />
                    </Field>
                    <Field label={t("library.recommendationForm.intervalMonths")}>
                      <input name="intervalMonths" inputMode="numeric" placeholder="6" className={inputClassName} />
                    </Field>
                  </div>
                  <button
                    type="submit"
                    className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-text px-5 py-3 text-sm font-bold text-surface transition hover:opacity-90"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    {t("library.recommendationForm.submit")}
                  </button>
                </form>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-bg p-8 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
                <p className="mt-4 text-base font-bold">{t("library.detail.emptyTitle")}</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{t("library.detail.emptyText")}</p>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

const inputClassName =
  "h-11 w-full rounded-2xl border border-border bg-surface px-3 text-sm font-semibold text-text outline-none transition placeholder:text-muted/70 focus:border-accent";

type FieldProps = {
  label: string;
  children: React.ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      {children}
    </label>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-bg p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-bold">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted">{children}</span>;
}

function formatYearRange(yearFrom: number | null, yearTo: number | null): string | null {
  if (yearFrom && yearTo) {
    return `${yearFrom}-${yearTo}`;
  }

  if (yearFrom) {
    return `${yearFrom}+`;
  }

  return null;
}

function formatInterval(intervalKm: number | null, intervalMonths: number | null, t: (key: string) => string): string {
  const parts = [];

  if (intervalKm) {
    parts.push(t("library.interval.km").replace("{value}", String(intervalKm)));
  }

  if (intervalMonths) {
    parts.push(t("library.interval.months").replace("{value}", String(intervalMonths)));
  }

  return parts.join(" / ") || t("library.interval.empty");
}

function safeErrorKey(error: string | undefined) {
  return error === "validation" || error === "recommendationValidation" || error === "shop" || error === "notFound"
    ? error
    : null;
}

async function loadLibraryData(input: {
  tenantId: string;
  countryCode: string;
  role: UserRole;
  sessionShopId: string;
  requestedShopId: string | undefined;
  selectedCatalogId: string | undefined;
  search: string | undefined;
}) {
  const shops = await prisma.shop.findMany({
    where: {
      tenantId: input.tenantId,
      countryCode: input.countryCode,
      isActive: true,
      ...(input.role === "SHOP_OWNER" ? {} : { id: input.sessionShopId }),
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (shops.length === 0) {
    redirect("/login?locale=ru");
  }

  const selectedShop = shops.find((shop) => shop.id === input.requestedShopId) ?? shops[0];
  const search = input.search?.trim();
  const [tenant, aiUsage, catalogs] = await Promise.all([
    prisma.tenant.findFirst({
      where: {
        id: input.tenantId,
        countryCode: input.countryCode,
      },
      select: {
        plan: true,
        subscription: {
          select: {
            aiMonthlyLimitMinorUsd: true,
          },
        },
      },
    }),
    prisma.aiUsage.aggregate({
      where: {
        tenantId: input.tenantId,
        month: currentAiUsageMonth(),
      },
      _sum: {
        estimatedCostMinorUsd: true,
      },
    }),
    prisma.vehicleCatalog.findMany({
    where: {
      countryCode: input.countryCode,
      ...(search
        ? {
            OR: [
              { make: { contains: search, mode: "insensitive" } },
              { model: { contains: search, mode: "insensitive" } },
              { generation: { contains: search, mode: "insensitive" } },
              { engineCode: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      make: true,
      model: true,
      generation: true,
      yearFrom: true,
      yearTo: true,
      engineCode: true,
      status: true,
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 40,
    }),
  ]);
  const selectedCatalogId = input.selectedCatalogId ?? catalogs[0]?.id;
  const selectedCatalog = selectedCatalogId
    ? await prisma.vehicleCatalog.findFirst({
        where: {
          id: selectedCatalogId,
          countryCode: input.countryCode,
        },
        select: {
          id: true,
          make: true,
          model: true,
          generation: true,
          yearFrom: true,
          yearTo: true,
          engineCode: true,
          engineVolume: true,
          fuelType: true,
          transmission: true,
          bodyType: true,
          status: true,
          recommendations: {
            select: {
              id: true,
              fluidType: true,
              viscosity: true,
              specification: true,
              volumeLiters: true,
              intervalKm: true,
              intervalMonths: true,
              priority: true,
              source: true,
              status: true,
            },
            orderBy: [{ fluidType: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
          },
        },
      })
    : null;
  const planLimits = getSubscriptionPlanLimits(tenant?.plan ?? "START");
  const aiBudget = calculateAiBudgetStatus({
    estimatedRequestCostMinorUsd: 50,
    limitMinorUsd: tenant?.subscription?.aiMonthlyLimitMinorUsd ?? planLimits.aiMonthlyLimitMinorUsd,
    usedMinorUsd: aiUsage._sum.estimatedCostMinorUsd ?? 0,
  });

  return {
    selectedShopId: selectedShop.id,
    aiBudget: {
      canRequest: aiBudget.canSpendEstimatedRequest,
      limitLabel: formatMoneyMinor(aiBudget.limitMinorUsd, "USD", "en"),
      remainingLabel: formatMoneyMinor(aiBudget.remainingMinorUsd, "USD", "en"),
      usedLabel: formatMoneyMinor(aiBudget.usedMinorUsd, "USD", "en"),
    },
    catalogs,
    selectedCatalog: selectedCatalog
      ? {
          ...selectedCatalog,
          engineVolume: selectedCatalog.engineVolume?.toString() ?? null,
          recommendations: selectedCatalog.recommendations.map((recommendation) => ({
            ...recommendation,
            volumeLiters: recommendation.volumeLiters.toString(),
          })),
        }
      : null,
  };
}
